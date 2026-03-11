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

function FieldTile({
  label,
  value,
  wide = false
}: {
  label: string
  value: React.ReactNode
  wide?: boolean
}) {
  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 1.75 },
        minHeight: 92,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'rgba(255,255,255,0.08)',
        bgcolor: 'rgba(255,255,255,0.03)',
        gridColumn: wide ? '1 / -1' : 'auto'
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          letterSpacing: 0.35,
          display: 'block',
          mb: 1
        }}
      >
        {label}
      </Typography>

      <Typography
        variant="body1"
        sx={{
          fontWeight: 800,
          lineHeight: 1.35,
          wordBreak: 'break-word'
        }}
      >
        {value}
      </Typography>
    </Box>
  )
}

function SectionCard({
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
        borderRadius: 4,
        border: '1px solid rgba(255,255,255,0.08)',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.02) 100%)',
        boxShadow: '0 10px 28px rgba(0,0,0,0.22)'
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={900}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
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
      <Stack spacing={3}>
        <Card
          sx={{
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.08)',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.02) 100%)',
            boxShadow: '0 14px 32px rgba(0,0,0,0.24)'
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
            <Stack spacing={3}>
              <Stack
                direction={{ xs: 'column', lg: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', lg: 'center' }}
                spacing={2}
              >
                <Box>
                  <Typography variant="h5" fontWeight={900}>
                    Registry Vehicle Record
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    Official digital vehicle registry view
                  </Typography>
                </Box>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.25}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  justifyContent="flex-end"
                  useFlexGap
                  flexWrap="wrap"
                  sx={{ width: { xs: '100%', lg: 'auto' } }}
                >
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={titleBrandLabel(title.record.brand)} />
                    <Chip label={recordStateLabel(title.record.state)} variant="outlined" />
                    <Chip label={`Token #${title.tokenId.toString()}`} variant="outlined" />
                  </Stack>

                  <Button
                    variant="outlined"
                    onClick={handlePrintCertificate}
                    sx={{
                      whiteSpace: 'nowrap',
                      minHeight: 40,
                      alignSelf: { xs: 'stretch', sm: 'center' }
                    }}
                  >
                    Print Digital Certificate
                  </Button>
                </Stack>
              </Stack>

              <Divider />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, lg: 8 }}>
                  <Stack spacing={2}>
                    <SectionCard
                      title="Vehicle Identity"
                      subtitle="Core vehicle and registry identification details."
                    >
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: 'repeat(2, minmax(0, 1fr))',
                            md: 'repeat(3, minmax(0, 1fr))'
                          },
                          gap: 1.5
                        }}
                      >
                        <FieldTile label="VIN" value={title.record.vin} wide />
                        <FieldTile label="Make" value={title.record.make} />
                        <FieldTile label="Model" value={title.record.model} />
                        <FieldTile label="Year" value={title.record.year.toString()} />
                        <FieldTile label="Token ID" value={`#${title.tokenId.toString()}`} />
                      </Box>
                    </SectionCard>

                    <SectionCard
                      title="Ownership & Registry Status"
                      subtitle="Current holder, title condition, and record state."
                    >
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: 'repeat(2, minmax(0, 1fr))',
                            md: 'repeat(3, minmax(0, 1fr))'
                          },
                          gap: 1.5
                        }}
                      >
                        <FieldTile label="Current Holder" value={shortAddress(title.owner)} wide />
                        <FieldTile
                          label="Title Brand"
                          value={titleBrandLabel(title.record.brand)}
                        />
                        <FieldTile
                          label="Record State"
                          value={recordStateLabel(title.record.state)}
                        />
                        <FieldTile
                          label="Legacy Digitised"
                          value={title.record.legacyDigitized ? 'Yes' : 'No'}
                        />
                      </Box>
                    </SectionCard>

                    <SectionCard
                      title="Usage & Audit"
                      subtitle="Mileage, reference data, and registry timestamps."
                    >
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: 'repeat(2, minmax(0, 1fr))',
                            md: 'repeat(2, minmax(0, 1fr))'
                          },
                          gap: 1.5
                        }}
                      >
                        <FieldTile label="Mileage" value={formatBigint(title.record.mileage)} />
                        <FieldTile
                          label="QR / Reference Data"
                          value={title.record.qrCodeData || '—'}
                          wide
                        />
                        <FieldTile label="Created" value={formatDate(title.record.createdAt)} />
                        <FieldTile label="Updated" value={formatDate(title.record.updatedAt)} />
                      </Box>
                    </SectionCard>

                    <Card
                      sx={{
                        borderRadius: 4,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background:
                          'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.018) 100%)'
                      }}
                    >
                      <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1.5}
                          flexWrap="wrap"
                          useFlexGap
                        >
                          <Button component={RouterLink} to="/transfer" variant="contained">
                            Transfer Title
                          </Button>
                          <Button component={RouterLink} to="/record-controls" variant="outlined">
                            Record Controls
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, lg: 4 }}>
                  <Stack spacing={2}>
                    <SectionCard title="VIN QR" subtitle={`Encoded VIN: ${title.record.vin}`}>
                      <Stack spacing={1.5} alignItems="center">
                        <Box
                          component="img"
                          src={qrUrl}
                          alt="VIN QR"
                          sx={{
                            width: { xs: 200, sm: 220 },
                            height: { xs: 200, sm: 220 },
                            borderRadius: 3,
                            bgcolor: '#fff',
                            p: 1.25,
                            border: '1px solid rgba(255,255,255,0.08)'
                          }}
                        />
                      </Stack>
                    </SectionCard>

                    <SectionCard
                      title="Vehicle Images / Metadata"
                      subtitle="Token metadata or image reference."
                    >
                      <Stack spacing={1.5}>
                        {imageUrl ? (
                          <>
                            {looksLikeImage(imageUrl) ? (
                              <Box
                                component="img"
                                src={imageUrl}
                                alt="Vehicle metadata"
                                sx={{
                                  width: '100%',
                                  maxHeight: 280,
                                  objectFit: 'cover',
                                  borderRadius: 2.5,
                                  border: '1px solid rgba(255,255,255,0.08)'
                                }}
                              />
                            ) : null}

                            <Link
                              href={imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              sx={{ wordBreak: 'break-all' }}
                            >
                              {title.tokenURI}
                            </Link>
                          </>
                        ) : (
                          <Typography color="text.secondary">No token URI set.</Typography>
                        )}
                      </Stack>
                    </SectionCard>
                  </Stack>
                </Grid>
              </Grid>
            </Stack>
          </CardContent>
        </Card>

        <SectionCard
          title="Record Notes & History"
          subtitle="Official updates, user notes, and timeline history for this title."
        >
          <Stack spacing={1.5}>
            {notes.length ? (
              notes.map((note) => (
                <Box
                  key={`${note.index.toString()}-${note.timestamp.toString()}`}
                  sx={{
                    p: 2,
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,0.02)'
                  }}
                >
                  <Stack spacing={1}>
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
        </SectionCard>

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
