// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title VehicleTitleRegistry
 * @notice ERC721-based registry for digital vehicle title records.
 * @dev
 * Core model:
 * - VIN is the unique vehicle identifier and is enforced on-chain.
 * - Existing paper-title vehicles are digitized by a registrar.
 * - Newly originated vehicles may optionally be minted by a manufacturer.
 * - The standard ownership transfer path is initiated by the current holder.
 * - Dealer and regulator roles are reserved for assisted or official actions.
 * - Notes/history are stored on-chain per title.
 * - tokenURI is supported for non-critical metadata such as media or display JSON.
 * - Direct public NFT transfers are blocked so title movement stays inside title workflows.
 */

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract VehicleTitleRegistry is ERC721, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Role allowed to digitize existing legacy paper-title vehicles.
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    /// @notice Role allowed to mint titles for newly originated vehicles.
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");

    /// @notice Role allowed to assist with dealership transfer workflows and official notes.
    bytes32 public constant DEALER_ROLE = keccak256("DEALER_ROLE");

    /// @notice Role allowed to perform official corrections, branding/status changes, freezes, and reassignments.
    bytes32 public constant REGULATOR_ROLE = keccak256("REGULATOR_ROLE");

    /**
     * @notice Title condition/branding classification.
     */
    enum TitleBrand {
        CLEAN,
        SALVAGE,
        REBUILT,
        LIEN,
        ODOMETER_DISCREPANCY,
        FLOOD,
        OTHER
    }

    /**
     * @notice Operational state of a title record.
     */
    enum RecordState {
        ACTIVE,
        FROZEN,
        REVOKED
    }

    /**
     * @notice Core on-chain record for a vehicle title.
     * @param vin Normalized uppercase VIN.
     * @param make Vehicle manufacturer/brand.
     * @param model Vehicle model.
     * @param year Vehicle model year.
     * @param mileage Current mileage stored on-chain.
     * @param qrCodeData Optional QR/reference data.
     * @param brand Title branding/status classification.
     * @param state Operational state of the title record.
     * @param legacyDigitized True if the record was created from a pre-existing paper title.
     * @param createdAt Timestamp of record creation.
     * @param updatedAt Timestamp of last record update.
     */
    struct VehicleRecord {
        string vin;
        string make;
        string model;
        uint256 year;
        uint256 mileage;
        string qrCodeData;
        TitleBrand brand;
        RecordState state;
        bool legacyDigitized;
        uint256 createdAt;
        uint256 updatedAt;
    }

    /**
     * @notice Note/history item stored against a title.
     * @param index Sequential note index for the token.
     * @param timestamp Block timestamp when the note was added.
     * @param author Address that added the note.
     * @param official True if the note was added in an official capacity.
     * @param text Note body.
     */
    struct Note {
        uint256 index;
        uint256 timestamp;
        address author;
        bool official;
        string text;
    }

    /// @dev Incrementing token id counter. Starts from 1.
    uint256 private _tokenIdCounter;

    /// @dev Internal guard used to allow only contract workflow transfers.
    bool private _titleWorkflowTransferActive;

    /// @dev tokenId => vehicle record
    mapping(uint256 => VehicleRecord) private _records;

    /// @dev keccak256(normalized VIN) => tokenId. Zero means not registered.
    mapping(bytes32 => uint256) private _vinToTokenId;

    /// @dev tokenId => note history array
    mapping(uint256 => Note[]) private _notes;

    /// @dev tokenId => token metadata URI for non-critical off-chain metadata
    mapping(uint256 => string) private _tokenURIs;

    /// @notice Emitted when a title is minted.
    event TitleMinted(
        uint256 indexed tokenId,
        address indexed holder,
        string vin,
        bool legacyDigitized,
        address indexed issuedBy
    );

    /// @notice Emitted when a current holder transfers title through the standard holder workflow.
    event OwnershipTransferredByHolder(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        address paymentToken,
        uint256 paymentAmount
    );

    /// @notice Emitted when a dealer-assisted transfer occurs.
    event OwnershipTransferredByDealer(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        address dealer
    );

    /// @notice Emitted when a regulator reassigns a title.
    event OwnershipReassignedByRegulator(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        address regulator
    );

    /// @notice Emitted when the record state changes.
    event RecordStateUpdated(
        uint256 indexed tokenId,
        RecordState previousState,
        RecordState newState,
        address indexed updatedBy
    );

    /// @notice Emitted when the title brand changes.
    event TitleBrandUpdated(
        uint256 indexed tokenId,
        TitleBrand previousBrand,
        TitleBrand newBrand,
        address indexed updatedBy
    );

    /// @notice Emitted when mileage is updated.
    event MileageUpdated(
        uint256 indexed tokenId,
        uint256 previousMileage,
        uint256 newMileage,
        address indexed updatedBy
    );

    /// @notice Emitted when a note is added to a title.
    event NoteAdded(
        uint256 indexed tokenId,
        uint256 indexed noteIndex,
        address indexed author,
        bool official,
        string text
    );

    /// @notice Emitted when a VIN is first registered.
    event VinRegistered(
        bytes32 indexed vinHash,
        uint256 indexed tokenId,
        string vin
    );

    /// @notice Emitted when token URI metadata is updated.
    event TokenURIUpdated(
        uint256 indexed tokenId,
        string newTokenURI,
        address indexed updatedBy
    );

    /**
     * @notice Deploy the title registry.
     * @param admin Address that receives admin, regulator, and registrar roles initially.
     */
    constructor(address admin) ERC721("DigitalVehicleTitle", "DVT") {
        require(admin != address(0), "Invalid admin");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGULATOR_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
    }

    // -------------------------------------------------------------------------
    // Access control
    // -------------------------------------------------------------------------

    /**
     * @notice Returns whether the contract supports an interface.
     * @param interfaceId ERC165 interface identifier.
     * @return True if supported.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @notice Grant registrar role to an account.
     * @param account Address to receive the role.
     */
    function grantRegistrarRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(REGISTRAR_ROLE, account);
    }

    /**
     * @notice Grant manufacturer role to an account.
     * @param account Address to receive the role.
     */
    function grantManufacturerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MANUFACTURER_ROLE, account);
    }

    /**
     * @notice Grant dealer role to an account.
     * @param account Address to receive the role.
     */
    function grantDealerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(DEALER_ROLE, account);
    }

    /**
     * @notice Grant regulator role to an account.
     * @param account Address to receive the role.
     */
    function grantRegulatorRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(REGULATOR_ROLE, account);
    }

    /**
     * @notice Revoke registrar role from an account.
     * @param account Address to revoke the role from.
     */
    function revokeRegistrarRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(REGISTRAR_ROLE, account);
    }

    /**
     * @notice Revoke manufacturer role from an account.
     * @param account Address to revoke the role from.
     */
    function revokeManufacturerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MANUFACTURER_ROLE, account);
    }

    /**
     * @notice Revoke dealer role from an account.
     * @param account Address to revoke the role from.
     */
    function revokeDealerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(DEALER_ROLE, account);
    }

    /**
     * @notice Revoke regulator role from an account.
     * @param account Address to revoke the role from.
     */
    function revokeRegulatorRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(REGULATOR_ROLE, account);
    }

    // -------------------------------------------------------------------------
    // Initial title creation
    // -------------------------------------------------------------------------

    /**
     * @notice Digitize an existing legacy paper-title vehicle into the system.
     * @dev Intended for pre-digitization vehicles where a trusted registrar verifies paperwork first.
     * @param holder Address that will receive the newly minted digital title.
     * @param vin Vehicle VIN.
     * @param make Vehicle make.
     * @param model Vehicle model.
     * @param year Vehicle year.
     * @param initialMileage Initial recorded mileage.
     * @param qrCodeData Optional QR/reference data.
     * @param brand Initial title branding.
     * @param initialTokenURI Metadata URI for non-critical off-chain metadata.
     * @param officialNote Optional official note to attach during mint.
     * @return tokenId Newly minted token id.
     */
    function digitizeLegacyTitle(
        address holder,
        string calldata vin,
        string calldata make,
        string calldata model,
        uint256 year,
        uint256 initialMileage,
        string calldata qrCodeData,
        TitleBrand brand,
        string calldata initialTokenURI,
        string calldata officialNote
    ) external onlyRole(REGISTRAR_ROLE) returns (uint256 tokenId) {
        tokenId = _mintTitleRecord(
            holder,
            vin,
            make,
            model,
            year,
            initialMileage,
            qrCodeData,
            brand,
            true,
            initialTokenURI
        );

        if (bytes(officialNote).length > 0) {
            _addNoteInternal(tokenId, msg.sender, true, officialNote);
        }
    }

    /**
     * @notice Mint a brand-new vehicle title into the system.
     * @dev Intended for newly originated vehicles entering the system directly from an approved manufacturer flow.
     * @param holder Address that will receive the newly minted digital title.
     * @param vin Vehicle VIN.
     * @param make Vehicle make.
     * @param model Vehicle model.
     * @param year Vehicle year.
     * @param initialMileage Initial mileage.
     * @param qrCodeData Optional QR/reference data.
     * @param brand Initial title branding.
     * @param initialTokenURI Metadata URI for non-critical off-chain metadata.
     * @param officialNote Optional official note to attach during mint.
     * @return tokenId Newly minted token id.
     */
    function mintNewVehicleTitle(
        address holder,
        string calldata vin,
        string calldata make,
        string calldata model,
        uint256 year,
        uint256 initialMileage,
        string calldata qrCodeData,
        TitleBrand brand,
        string calldata initialTokenURI,
        string calldata officialNote
    ) external onlyRole(MANUFACTURER_ROLE) returns (uint256 tokenId) {
        tokenId = _mintTitleRecord(
            holder,
            vin,
            make,
            model,
            year,
            initialMileage,
            qrCodeData,
            brand,
            false,
            initialTokenURI
        );

        if (bytes(officialNote).length > 0) {
            _addNoteInternal(tokenId, msg.sender, true, officialNote);
        }
    }

    // -------------------------------------------------------------------------
    // Normal holder transfer
    // -------------------------------------------------------------------------

    /**
     * @notice Transfer title to a new holder through the normal holder-driven workflow.
     * @dev This is the standard day-to-day transfer path. The current holder initiates the transfer.
     * @param tokenId Title token id.
     * @param newHolder Address of the next holder.
     * @param paymentToken Optional ERC20 payment token. Set to zero address when paymentAmount is zero.
     * @param paymentAmount Optional ERC20 payment amount to transfer from new holder to current holder.
     * @param holderNote Optional note to store with the transfer.
     */
    function transferTitleByHolder(
        uint256 tokenId,
        address newHolder,
        address paymentToken,
        uint256 paymentAmount,
        string calldata holderNote
    ) external nonReentrant {
        require(_existsStrict(tokenId), "Token does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not current holder");
        require(newHolder != address(0), "Invalid new holder");
        require(newHolder != msg.sender, "Cannot transfer to self");
        require(_records[tokenId].state == RecordState.ACTIVE, "Record not active");

        if (paymentAmount > 0) {
            require(paymentToken != address(0), "Invalid payment token");
            IERC20(paymentToken).safeTransferFrom(newHolder, msg.sender, paymentAmount);
        }

        _workflowTransfer(msg.sender, newHolder, tokenId);
        _touchRecord(tokenId);

        emit OwnershipTransferredByHolder(tokenId, msg.sender, newHolder, paymentToken, paymentAmount);

        if (bytes(holderNote).length > 0) {
            _addNoteInternal(tokenId, msg.sender, false, holderNote);
        }
    }

    // -------------------------------------------------------------------------
    // Assisted / official transfer
    // -------------------------------------------------------------------------

    /**
     * @notice Transfer title through a dealer-assisted workflow.
     * @dev Intended for dealership or assisted handoff cases.
     * @param tokenId Title token id.
     * @param from Current holder.
     * @param newHolder Next holder.
     * @param dealerNote Optional official note.
     */
    function transferTitleByDealer(
        uint256 tokenId,
        address from,
        address newHolder,
        string calldata dealerNote
    ) external onlyRole(DEALER_ROLE) nonReentrant {
        require(_existsStrict(tokenId), "Token does not exist");
        require(ownerOf(tokenId) == from, "From is not current holder");
        require(newHolder != address(0), "Invalid new holder");
        require(newHolder != from, "Cannot transfer to self");
        require(_records[tokenId].state == RecordState.ACTIVE, "Record not active");

        _workflowTransfer(from, newHolder, tokenId);
        _touchRecord(tokenId);

        emit OwnershipTransferredByDealer(tokenId, from, newHolder, msg.sender);

        if (bytes(dealerNote).length > 0) {
            _addNoteInternal(tokenId, msg.sender, true, dealerNote);
        }
    }

    /**
     * @notice Reassign title through a regulator-authorized workflow.
     * @dev Intended for correction, recovery, legal order, or administrative exception handling.
     * @param tokenId Title token id.
     * @param newHolder Next holder.
     * @param officialNote Optional official note.
     */
    function reassignTitleByRegulator(
        uint256 tokenId,
        address newHolder,
        string calldata officialNote
    ) external onlyRole(REGULATOR_ROLE) nonReentrant {
        require(_existsStrict(tokenId), "Token does not exist");
        require(newHolder != address(0), "Invalid new holder");
        require(_records[tokenId].state != RecordState.REVOKED, "Record revoked");

        address currentHolder = ownerOf(tokenId);
        require(currentHolder != newHolder, "Already assigned");

        _workflowTransfer(currentHolder, newHolder, tokenId);
        _touchRecord(tokenId);

        emit OwnershipReassignedByRegulator(tokenId, currentHolder, newHolder, msg.sender);

        if (bytes(officialNote).length > 0) {
            _addNoteInternal(tokenId, msg.sender, true, officialNote);
        }
    }

    // -------------------------------------------------------------------------
    // Record updates
    // -------------------------------------------------------------------------

    /**
     * @notice Update mileage on a title record.
     * @dev Only the current holder can update mileage, and mileage may only increase.
     * @param tokenId Title token id.
     * @param newMileage New mileage value.
     */
    function updateMileage(uint256 tokenId, uint256 newMileage) external {
        require(_existsStrict(tokenId), "Token does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not current holder");
        require(_records[tokenId].state == RecordState.ACTIVE, "Record not active");
        require(newMileage > _records[tokenId].mileage, "Mileage cannot decrease");

        uint256 previousMileage = _records[tokenId].mileage;
        _records[tokenId].mileage = newMileage;
        _touchRecord(tokenId);

        emit MileageUpdated(tokenId, previousMileage, newMileage, msg.sender);
    }

    /**
     * @notice Update title brand/status classification.
     * @param tokenId Title token id.
     * @param newBrand New title brand.
     * @param officialNote Optional official note.
     */
    function updateTitleBrand(
        uint256 tokenId,
        TitleBrand newBrand,
        string calldata officialNote
    ) external onlyRole(REGULATOR_ROLE) {
        require(_existsStrict(tokenId), "Token does not exist");

        TitleBrand previousBrand = _records[tokenId].brand;
        _records[tokenId].brand = newBrand;
        _touchRecord(tokenId);

        emit TitleBrandUpdated(tokenId, previousBrand, newBrand, msg.sender);

        if (bytes(officialNote).length > 0) {
            _addNoteInternal(tokenId, msg.sender, true, officialNote);
        }
    }

    /**
     * @notice Update the operational state of a title record.
     * @param tokenId Title token id.
     * @param newState New record state.
     * @param officialNote Optional official note.
     */
    function updateRecordState(
        uint256 tokenId,
        RecordState newState,
        string calldata officialNote
    ) external onlyRole(REGULATOR_ROLE) {
        require(_existsStrict(tokenId), "Token does not exist");

        RecordState previousState = _records[tokenId].state;
        _records[tokenId].state = newState;
        _touchRecord(tokenId);

        emit RecordStateUpdated(tokenId, previousState, newState, msg.sender);

        if (bytes(officialNote).length > 0) {
            _addNoteInternal(tokenId, msg.sender, true, officialNote);
        }
    }

    /**
     * @notice Update QR/reference data for a title record.
     * @param tokenId Title token id.
     * @param newQrCodeData New QR/reference data.
     */
    function updateQrCodeData(
        uint256 tokenId,
        string calldata newQrCodeData
    ) external onlyRole(REGULATOR_ROLE) {
        require(_existsStrict(tokenId), "Token does not exist");
        _records[tokenId].qrCodeData = newQrCodeData;
        _touchRecord(tokenId);
    }

    /**
     * @notice Update token URI metadata for a title.
     * @dev tokenURI is intended only for non-critical supporting metadata.
     * @param tokenId Title token id.
     * @param newTokenURI New metadata URI.
     * @param officialNote Optional official note.
     */
    function updateTokenURI(
        uint256 tokenId,
        string calldata newTokenURI,
        string calldata officialNote
    ) external {
        require(_existsStrict(tokenId), "Token does not exist");
        require(
            hasRole(REGULATOR_ROLE, msg.sender) || hasRole(REGISTRAR_ROLE, msg.sender),
            "Not authorized"
        );

        _tokenURIs[tokenId] = newTokenURI;
        _touchRecord(tokenId);

        emit TokenURIUpdated(tokenId, newTokenURI, msg.sender);

        if (bytes(officialNote).length > 0) {
            _addNoteInternal(tokenId, msg.sender, true, officialNote);
        }
    }

    // -------------------------------------------------------------------------
    // Notes / history
    // -------------------------------------------------------------------------

    /**
     * @notice Add a note to a title record.
     * @param tokenId Title token id.
     * @param text Note body.
     * @param official Whether the note should be marked official.
     */
    function addNote(
        uint256 tokenId,
        string calldata text,
        bool official
    ) external {
        require(_existsStrict(tokenId), "Token does not exist");
        require(bytes(text).length > 0, "Empty note");

        bool isHolder = ownerOf(tokenId) == msg.sender;
        bool isDealer = hasRole(DEALER_ROLE, msg.sender);
        bool isRegulator = hasRole(REGULATOR_ROLE, msg.sender);
        bool isRegistrar = hasRole(REGISTRAR_ROLE, msg.sender);

        require(isHolder || isDealer || isRegulator || isRegistrar, "Not permitted");

        if (official) {
            require(isDealer || isRegulator || isRegistrar, "Official note not allowed");
        }

        _addNoteInternal(tokenId, msg.sender, official, text);
    }

    /**
     * @notice Return total number of notes stored for a title.
     * @param tokenId Title token id.
     * @return Number of notes.
     */
    function getNoteCount(uint256 tokenId) external view returns (uint256) {
        require(_existsStrict(tokenId), "Token does not exist");
        return _notes[tokenId].length;
    }

    /**
     * @notice Return one note by index.
     * @param tokenId Title token id.
     * @param index Note index.
     * @return Note struct.
     */
    function getNote(uint256 tokenId, uint256 index) external view returns (Note memory) {
        require(_existsStrict(tokenId), "Token does not exist");
        require(index < _notes[tokenId].length, "Note index out of bounds");
        return _notes[tokenId][index];
    }

    /**
     * @notice Return all notes stored for a title.
     * @dev Suitable for smaller histories; pagination may be preferable for very large histories later.
     * @param tokenId Title token id.
     * @return Array of notes.
     */
    function getAllNotes(uint256 tokenId) external view returns (Note[] memory) {
        require(_existsStrict(tokenId), "Token does not exist");
        return _notes[tokenId];
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------

    /**
     * @notice Return the core on-chain vehicle record for a title.
     * @param tokenId Title token id.
     * @return VehicleRecord struct.
     */
    function getVehicleRecord(uint256 tokenId) external view returns (VehicleRecord memory) {
        require(_existsStrict(tokenId), "Token does not exist");
        return _records[tokenId];
    }

    /**
     * @notice Return whether a VIN is already registered.
     * @param vin VIN string.
     * @return True if the VIN is already registered.
     */
    function vinExists(string calldata vin) external view returns (bool) {
        string memory normalizedVin = _normalizeVin(vin);
        bytes32 vinHash = keccak256(abi.encodePacked(normalizedVin));
        return _vinToTokenId[vinHash] != 0;
    }

    /**
     * @notice Return token id for a VIN if it exists, or zero otherwise.
     * @param vin VIN string.
     * @return tokenId Matching token id or zero.
     */
    function tokenIdForVin(string calldata vin) external view returns (uint256) {
        string memory normalizedVin = _normalizeVin(vin);
        bytes32 vinHash = keccak256(abi.encodePacked(normalizedVin));
        return _vinToTokenId[vinHash];
    }

    /**
     * @notice Return title record by VIN.
     * @param vin VIN string.
     * @return tokenId Matching token id.
     * @return record Matching vehicle record.
     */
    function getRecordByVin(string calldata vin)
        external
        view
        returns (uint256 tokenId, VehicleRecord memory record)
    {
        string memory normalizedVin = _normalizeVin(vin);
        bytes32 vinHash = keccak256(abi.encodePacked(normalizedVin));
        tokenId = _vinToTokenId[vinHash];
        require(tokenId != 0, "VIN not registered");
        record = _records[tokenId];
    }

    /**
     * @notice Return metadata URI for a title.
     * @param tokenId Title token id.
     * @return Metadata URI string.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_existsStrict(tokenId), "Token does not exist");
        return _tokenURIs[tokenId];
    }

    // -------------------------------------------------------------------------
    // Internal mint / transfer restrictions
    // -------------------------------------------------------------------------

    /**
     * @notice Internal mint helper used by registrar and manufacturer flows.
     * @param holder Recipient of the title token.
     * @param vin Vehicle VIN.
     * @param make Vehicle make.
     * @param model Vehicle model.
     * @param year Vehicle year.
     * @param initialMileage Initial mileage.
     * @param qrCodeData Optional QR/reference data.
     * @param brand Initial title brand.
     * @param legacyDigitized Whether this came from legacy paper-title digitization.
     * @param initialTokenURI Initial metadata URI.
     * @return tokenId Newly minted token id.
     */
    function _mintTitleRecord(
        address holder,
        string calldata vin,
        string calldata make,
        string calldata model,
        uint256 year,
        uint256 initialMileage,
        string calldata qrCodeData,
        TitleBrand brand,
        bool legacyDigitized,
        string calldata initialTokenURI
    ) internal returns (uint256 tokenId) {
        require(holder != address(0), "Invalid holder");

        string memory normalizedVin = _normalizeVin(vin);
        require(_isValidVin(normalizedVin), "Invalid VIN");

        bytes32 vinHash = keccak256(abi.encodePacked(normalizedVin));
        require(_vinToTokenId[vinHash] == 0, "VIN already registered");

        _tokenIdCounter += 1;
        tokenId = _tokenIdCounter;

        _safeMint(holder, tokenId);

        _records[tokenId] = VehicleRecord({
            vin: normalizedVin,
            make: make,
            model: model,
            year: year,
            mileage: initialMileage,
            qrCodeData: qrCodeData,
            brand: brand,
            state: RecordState.ACTIVE,
            legacyDigitized: legacyDigitized,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        _vinToTokenId[vinHash] = tokenId;
        _tokenURIs[tokenId] = initialTokenURI;

        emit VinRegistered(vinHash, tokenId, normalizedVin);
        emit TokenURIUpdated(tokenId, initialTokenURI, msg.sender);
        emit TitleMinted(tokenId, holder, normalizedVin, legacyDigitized, msg.sender);
    }

    /**
     * @notice Internal helper for workflow-approved title transfers.
     * @param from Current holder.
     * @param to New holder.
     * @param tokenId Title token id.
     */
    function _workflowTransfer(address from, address to, uint256 tokenId) internal {
        _titleWorkflowTransferActive = true;
        _transfer(from, to, tokenId);
        _titleWorkflowTransferActive = false;
    }

    /**
     * @notice OZ5 ownership update hook override used to block direct public ERC721 transfers.
     * @dev
     * Allows minting and future burns, but blocks regular owner-to-owner transfers
     * unless they are executed through this contract's explicit title workflow.
     * @param to Destination address.
     * @param tokenId Token id being updated.
     * @param auth Optional authorized operator address used by OZ internals.
     * @return from Previous owner address.
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address from)
    {
        from = _ownerOf(tokenId);

        if (from != address(0) && to != address(0)) {
            require(_titleWorkflowTransferActive, "Direct transfer disabled: use title workflow");
        }

        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Internal existence check.
     * @param tokenId Title token id.
     * @return True if token exists.
     */
    function _existsStrict(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    /**
     * @notice Update the record timestamp for a title.
     * @param tokenId Title token id.
     */
    function _touchRecord(uint256 tokenId) internal {
        _records[tokenId].updatedAt = block.timestamp;
    }

    /**
     * @notice Internal helper to append a note to a title.
     * @param tokenId Title token id.
     * @param author Address adding the note.
     * @param official Whether the note is official.
     * @param text Note content.
     */
    function _addNoteInternal(
        uint256 tokenId,
        address author,
        bool official,
        string memory text
    ) internal {
        uint256 index = _notes[tokenId].length;

        _notes[tokenId].push(
            Note({
                index: index,
                timestamp: block.timestamp,
                author: author,
                official: official,
                text: text
            })
        );

        emit NoteAdded(tokenId, index, author, official, text);
    }

    // -------------------------------------------------------------------------
    // VIN helpers
    // -------------------------------------------------------------------------

    /**
     * @notice Normalize a VIN to uppercase.
     * @param vin Input VIN.
     * @return Normalized VIN.
     */
    function _normalizeVin(string memory vin) internal pure returns (string memory) {
        bytes memory src = bytes(vin);
        require(src.length == 17, "VIN must be 17 chars");

        bytes memory out = new bytes(17);

        for (uint256 i = 0; i < 17; i++) {
            bytes1 ch = src[i];

            if (uint8(ch) >= 97 && uint8(ch) <= 122) {
                ch = bytes1(uint8(ch) - 32);
            }

            out[i] = ch;
        }

        return string(out);
    }

    /**
     * @notice Validate VIN structure and checksum.
     * @param vin Normalized VIN.
     * @return True if VIN is structurally valid and checksum passes.
     */
    function _isValidVin(string memory vin) internal pure returns (bool) {
        bytes memory v = bytes(vin);
        if (v.length != 17) return false;

        for (uint256 i = 0; i < 17; i++) {
            if (!_isValidVinChar(v[i])) {
                return false;
            }
        }

        uint256[17] memory weights = [uint256(8), 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
        uint256 sum = 0;

        for (uint256 i = 0; i < 17; i++) {
            uint256 value = _vinCharValue(v[i]);
            sum += value * weights[i];
        }

        uint256 remainder = sum % 11;
        bytes1 expectedCheck = remainder == 10 ? bytes1("X") : bytes1(uint8(48 + remainder));

        return v[8] == expectedCheck;
    }

    /**
     * @notice Validate one VIN character.
     * @param ch Character to validate.
     * @return True if valid.
     */
    function _isValidVinChar(bytes1 ch) internal pure returns (bool) {
        uint8 c = uint8(ch);

        if (c >= 48 && c <= 57) return true;

        if (c >= 65 && c <= 90) {
            if (ch == bytes1("I") || ch == bytes1("O") || ch == bytes1("Q")) {
                return false;
            }
            return true;
        }

        return false;
    }

    /**
     * @notice Convert VIN character into checksum numeric value.
     * @param ch VIN character.
     * @return Numeric VIN transliteration value.
     */
    function _vinCharValue(bytes1 ch) internal pure returns (uint256) {
        if (ch >= bytes1("0") && ch <= bytes1("9")) return uint8(ch) - 48;
        if (ch == bytes1("A") || ch == bytes1("J")) return 1;
        if (ch == bytes1("B") || ch == bytes1("K") || ch == bytes1("S")) return 2;
        if (ch == bytes1("C") || ch == bytes1("L") || ch == bytes1("T")) return 3;
        if (ch == bytes1("D") || ch == bytes1("M") || ch == bytes1("U")) return 4;
        if (ch == bytes1("E") || ch == bytes1("N") || ch == bytes1("V")) return 5;
        if (ch == bytes1("F") || ch == bytes1("W")) return 6;
        if (ch == bytes1("G") || ch == bytes1("P") || ch == bytes1("X")) return 7;
        if (ch == bytes1("H") || ch == bytes1("Y")) return 8;
        if (ch == bytes1("R") || ch == bytes1("Z")) return 9;
        revert("Invalid VIN character");
    }
}
