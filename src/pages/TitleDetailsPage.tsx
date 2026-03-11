import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Link,
  Stack,
  Typography
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { Page } from '../components/Page'
import { readNotes, readTitle } from '../lib/contract'
import type { NoteItem, OwnedTitle } from '../types'
import {
  formatBigint,
  formatDate,
  maybeHttp,
  recordStateLabel,
  shortAddress,
  titleBrandLabel
} from '../utils/format'

function qrImageUrl(value: string) {
  const encoded = encodeURIComponent(value)
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`
}

function looksLikeImage(url?: string) {
  if (!url) return false
  const lower = url.toLowerCase()
  return (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif') ||
    lower.includes('image')
  )
}

function DetailRow({
  label,
  value
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Stack>
  )
}

function Panel({
  title,
  subtitle,
  children
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <Card
      sx={{
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.08)',
        bgcolor: 'rgba(255,255,255,0.02)',
        boxShadow: 'none'
      }}
    >
      <CardContent sx={{ p: { xs: 1.75, sm: 2.25 } }}>
        <Stack spacing={1.75}>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          {children}
        </Stack>
      </CardContent>
    </Card>
  )
}

export function TitleDetailsPage() {
  const { tokenId = '' } = useParams()
  const [title, setTitle] = useState<OwnedTitle | null>(null)
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const certificateRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [nextTitle, nextNotes] = await Promise.all([
          readTitle(BigInt(tokenId)),
          readNotes(BigInt(tokenId))
        ])

        if (!cancelled) {
          setTitle(nextTitle)
          setNotes(nextNotes)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.shortMessage || e?.message || 'Unable to load title')
      }
    }

    if (tokenId) void load()

    return () => {
      cancelled = true
    }
  }, [tokenId])

  const qrUrl = useMemo(() => {
    if (!title) return ''
    return qrImageUrl(title.record.vin)
  }, [title])

  function handlePrintCertificate() {
    const node = certificateRef.current
    if (!node || !title) return

    const printWindow = window.open('', '_blank', 'width=1100,height=900')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Vehicle Registration Certificate - ${title.record.vin}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 24px;
              background: #f3f4f6;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
            }
            .sheet {
              max-width: 960px;
              margin: 0 auto;
              background: #ffffff;
              border: 2px solid #111827;
              padding: 28px;
            }
            .topbar {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 24px;
              border-bottom: 2px solid #111827;
              padding-bottom: 18px;
              margin-bottom: 22px;
            }
            .title {
              font-size: 28px;
              font-weight: 800;
              line-height: 1.1;
              margin: 0 0 8px 0;
            }
            .subtitle {
              font-size: 13px;
              color: #374151;
              margin: 0;
            }
            .qrbox {
              width: 180px;
              text-align: center;
              flex-shrink: 0;
            }
            .qrbox img {
              width: 160px;
              height: 160px;
              display: block;
              margin: 0 auto 8px auto;
              border: 1px solid #d1d5db;
              padding: 8px;
              background: #fff;
            }
            .section-title {
              font-size: 14px;
              font-weight: 800;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              margin: 20px 0 12px 0;
              color: #111827;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
            }
            .cell {
              border: 1px solid #d1d5db;
              padding: 12px;
              min-height: 72px;
            }
            .label {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              color: #6b7280;
              margin-bottom: 6px;
            }
            .value {
              font-size: 16px;
              font-weight: 700;
              word-break: break-word;
            }
            .meta {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
            }
            .notes {
              border: 1px solid #d1d5db;
              padding: 14px;
            }
            .note {
              padding: 10px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .note:last-child {
              border-bottom: none;
            }
            .note-head {
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 4px;
            }
            .note-text {
              font-size: 14px;
              color: #111827;
            }
            .footer {
              margin-top: 24px;
              border-top: 1px solid #d1d5db;
              padding-top: 14px;
              font-size: 12px;
              color: #4b5563;
            }
          </style>
        </head>
        <body>
          ${node.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  if (error) {
    return (
      <Page title="Title Details" subtitle="Single title record view.">
        <Alert severity="error">{error}</Alert>
      </Page>
    )
  }

  if (!title) {
    return (
      <Page title="Title Details" subtitle="Single title record view.">
        <Typography>Loading title record…</Typography>
      </Page>
    )
  }

  const imageUrl = maybeHttp(title.tokenURI)

  return (
    <Page
      title={`Vehicle Record #${title.tokenId.toString()}`}
      subtitle={`${title.record.year.toString()} ${title.record.make} ${title.record.model}`}
      chips={[titleBrandLabel(title.record.brand), recordStateLabel(title.record.state)]}
    >
      <Stack spacing={2.25}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Panel
              title="Registry Vehicle Record"
              subtitle="Official digital vehicle registry view"
            >
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  spacing={1.5}
                >
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={titleBrandLabel(title.record.brand)} size="small" />
                    <Chip label={recordStateLabel(title.record.state)} size="small" variant="outlined" />
                    <Chip label={`Token #${title.tokenId.toString()}`} size="small" variant="outlined" />
                  </Stack>

                  <Button
                    variant="outlined"
                    onClick={handlePrintCertificate}
                    sx={{ whiteSpace: 'nowrap', minHeight: 38 }}
                  >
                    Print Digital Certificate
                  </Button>
                </Stack>

                <Divider />

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailRow label="VIN" value={title.record.vin} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailRow label="Current Holder" value={shortAddress(title.owner)} />
                  </Grid>

                  <Grid size={{ xs: 6, md: 3 }}>
                    <DetailRow label="Make" value={title.record.make} />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <DetailRow label="Model" value={title.record.model} />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <DetailRow label="Year" value={title.record.year.toString()} />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <DetailRow label="Token ID" value={`#${title.tokenId.toString()}`} />
                  </Grid>
                </Grid>
              </Stack>
            </Panel>

            <Stack spacing={2} sx={{ mt: 2 }}>
              <Panel
                title="Ownership & Registry Status"
                subtitle="Current holder, title condition, and record state."
              >
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailRow label="Title Brand" value={titleBrandLabel(title.record.brand)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailRow label="Record State" value={recordStateLabel(title.record.state)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailRow label="Legacy Digitised" value={title.record.legacyDigitized ? 'Yes' : 'No'} />
                  </Grid>
                </Grid>
              </Panel>

              <Panel
                title="Usage & Audit"
                subtitle="Mileage, reference data, and registry timestamps."
              >
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <DetailRow label="Mileage" value={formatBigint(title.record.mileage)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    <DetailRow label="QR / Reference Data" value={title.record.qrCodeData || '—'} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailRow label="Created" value={formatDate(title.record.createdAt)} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <DetailRow label="Updated" value={formatDate(title.record.updatedAt)} />
                  </Grid>
                </Grid>
              </Panel>

              <Panel title="Actions">
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} flexWrap="wrap" useFlexGap>
                  <Button component={RouterLink} to="/transfer" variant="contained">
                    Transfer Title
                  </Button>
                  <Button component={RouterLink} to="/record-controls" variant="outlined">
                    Record Controls
                  </Button>
                </Stack>
              </Panel>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={2}>
              <Panel title="VIN QR" subtitle={`Encoded VIN: ${title.record.vin}`}>
                <Stack spacing={1.25} alignItems="center">
                  <Box
                    component="img"
                    src={qrUrl}
                    alt="VIN QR"
                    sx={{
                      width: { xs: 180, sm: 220 },
                      height: { xs: 180, sm: 220 },
                      borderRadius: 1.5,
                      bgcolor: '#fff',
                      p: 1,
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}
                  />
                </Stack>
              </Panel>

              <Panel title="Vehicle Images / Metadata" subtitle="Token metadata or image reference.">
                <Stack spacing={1.25}>
                  {imageUrl ? (
                    <>
                      {looksLikeImage(imageUrl) ? (
                        <Box
                          component="img"
                          src={imageUrl}
                          alt="Vehicle metadata"
                          sx={{
                            width: '100%',
                            maxHeight: 260,
                            objectFit: 'cover',
                            borderRadius: 1.5,
                            border: '1px solid rgba(255,255,255,0.08)'
                          }}
                        />
                      ) : null}

                      <Link href={imageUrl} target="_blank" rel="noreferrer" sx={{ wordBreak: 'break-all' }}>
                        {title.tokenURI}
                      </Link>
                    </>
                  ) : (
                    <Typography color="text.secondary">No token URI set.</Typography>
                  )}
                </Stack>
              </Panel>
            </Stack>
          </Grid>
        </Grid>

        <Panel
          title="Record Notes & History"
          subtitle="Official updates, user notes, and timeline history for this title."
        >
          <Stack spacing={1.25}>
            {notes.length ? (
              notes.map((note) => (
                <Box
                  key={`${note.index.toString()}-${note.timestamp.toString()}`}
                  sx={{
                    p: 1.5,
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.02)'
                  }}
                >
                  <Stack spacing={0.75}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={`#${note.index.toString()}`} />
                      {note.official ? (
                        <Chip size="small" color="primary" label="Official" />
                      ) : (
                        <Chip size="small" variant="outlined" label="User Note" />
                      )}
                      <Chip size="small" variant="outlined" label={shortAddress(note.author)} />
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      {formatDate(note.timestamp)}
                    </Typography>

                    <Typography>{note.text}</Typography>
                  </Stack>
                </Box>
              ))
            ) : (
              <Typography color="text.secondary">No notes on this record yet.</Typography>
            )}
          </Stack>
        </Panel>

        <Box ref={certificateRef} sx={{ display: 'none' }}>
          <div className="sheet">
            <div className="topbar">
              <div>
                <div className="title">Digital Vehicle Registration Certificate</div>
                <p className="subtitle">
                  Vehicle Title Registry • Certificate for Token #{title.tokenId.toString()}
                </p>
                <p className="subtitle">
                  Official digital vehicle registration record generated from the on-chain registry.
                </p>
              </div>

              <div className="qrbox">
                <img src={qrUrl} alt="VIN QR" />
                <div style={{ fontSize: '11px', color: '#4b5563', wordBreak: 'break-word' }}>
                  VIN QR
                </div>
              </div>
            </div>

            <div className="section-title">Vehicle Identification</div>
            <div className="grid">
              <div className="cell">
                <div className="label">VIN</div>
                <div className="value">{title.record.vin}</div>
              </div>
              <div className="cell">
                <div className="label">Make</div>
                <div className="value">{title.record.make}</div>
              </div>
              <div className="cell">
                <div className="label">Model</div>
                <div className="value">{title.record.model}</div>
              </div>
              <div className="cell">
                <div className="label">Year</div>
                <div className="value">{title.record.year.toString()}</div>
              </div>
              <div className="cell">
                <div className="label">Mileage</div>
                <div className="value">{formatBigint(title.record.mileage)}</div>
              </div>
              <div className="cell">
                <div className="label">Current Holder</div>
                <div className="value">{title.owner}</div>
              </div>
            </div>

            <div className="section-title">Registry Status</div>
            <div className="grid">
              <div className="cell">
                <div className="label">Title Brand</div>
                <div className="value">{titleBrandLabel(title.record.brand)}</div>
              </div>
              <div className="cell">
                <div className="label">Record State</div>
                <div className="value">{recordStateLabel(title.record.state)}</div>
              </div>
              <div className="cell">
                <div className="label">Legacy Digitised</div>
                <div className="value">{title.record.legacyDigitized ? 'Yes' : 'No'}</div>
              </div>
            </div>

            <div className="section-title">Administrative Details</div>
            <div className="meta">
              <div className="cell">
                <div className="label">QR / Reference Data</div>
                <div className="value">{title.record.qrCodeData || '—'}</div>
              </div>
              <div className="cell">
                <div className="label">Token ID</div>
                <div className="value">#{title.tokenId.toString()}</div>
              </div>
              <div className="cell">
                <div className="label">Created</div>
                <div className="value">{formatDate(title.record.createdAt)}</div>
              </div>
              <div className="cell">
                <div className="label">Updated</div>
                <div className="value">{formatDate(title.record.updatedAt)}</div>
              </div>
            </div>

            <div className="section-title">Registry Notes</div>
            <div className="notes">
              {notes.length ? (
                notes.map((note) => (
                  <div className="note" key={`${note.index.toString()}-${note.timestamp.toString()}`}>
                    <div className="note-head">
                      #{note.index.toString()} • {note.official ? 'Official' : 'User'} • {note.author} • {formatDate(note.timestamp)}
                    </div>
                    <div className="note-text">{note.text}</div>
                  </div>
                ))
              ) : (
                <div className="note-text">No notes recorded.</div>
              )}
            </div>

            <div className="footer">
              This certificate is a printable representation of the on-chain vehicle record at the time of generation.
            </div>
          </div>
        </Box>
      </Stack>
    </Page>
  )
}
