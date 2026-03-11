import { Alert, Button, Chip, Divider, Link, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { Page } from '../components/Page'
import { readNotes, readTitle } from '../lib/contract'
import type { NoteItem, OwnedTitle } from '../types'
import { formatBigint, formatDate, maybeHttp, recordStateLabel, shortAddress, titleBrandLabel } from '../utils/format'

export function TitleDetailsPage() {
  const { tokenId = '' } = useParams()
  const [title, setTitle] = useState<OwnedTitle | null>(null)
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [error, setError] = useState<string | null>(null)

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

  return (
    <Page
      title={`Token #${title.tokenId.toString()}`}
      subtitle={`${title.record.year.toString()} ${title.record.make} ${title.record.model}`}
      chips={[titleBrandLabel(title.record.brand), recordStateLabel(title.record.state)]}
    >
      <Stack spacing={2}>
        <Typography>VIN: <strong>{title.record.vin}</strong></Typography>
        <Typography>Owner: <strong>{shortAddress(title.owner)}</strong></Typography>
        <Typography>Mileage: <strong>{formatBigint(title.record.mileage)}</strong></Typography>
        <Typography>Legacy digitised: <strong>{title.record.legacyDigitized ? 'Yes' : 'No'}</strong></Typography>
        <Typography>QR / reference: <strong>{title.record.qrCodeData || '—'}</strong></Typography>
        <Typography>Created: <strong>{formatDate(title.record.createdAt)}</strong></Typography>
        <Typography>Updated: <strong>{formatDate(title.record.updatedAt)}</strong></Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={titleBrandLabel(title.record.brand)} />
          <Chip label={recordStateLabel(title.record.state)} variant="outlined" />
        </Stack>

        <Divider />

        <Typography variant="h6">Metadata URI</Typography>
        {title.tokenURI ? (
          <Link href={maybeHttp(title.tokenURI)} target="_blank" rel="noreferrer">
            {title.tokenURI}
          </Link>
        ) : (
          <Typography color="text.secondary">No token URI set.</Typography>
        )}

        <Divider />

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button component={RouterLink} to="/transfer" variant="contained">Transfer Title</Button>
          <Button component={RouterLink} to="/record-controls" variant="outlined">Record Controls</Button>
        </Stack>

        <Divider />

        <Typography variant="h6">Notes & history</Typography>
        <Stack spacing={1.5}>
          {notes.length ? (
            notes.map((note) => (
              <Stack
                key={`${note.index.toString()}-${note.timestamp.toString()}`}
                spacing={0.5}
                sx={{ p: 1.5, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2 }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={`#${note.index.toString()}`} />
                  {note.official ? (
                    <Chip size="small" color="primary" label="Official" />
                  ) : (
                    <Chip size="small" variant="outlined" label="User note" />
                  )}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {shortAddress(note.author)} • {formatDate(note.timestamp)}
                </Typography>
                <Typography>{note.text}</Typography>
              </Stack>
            ))
          ) : (
            <Typography color="text.secondary">No notes on this record yet.</Typography>
          )}
        </Stack>
      </Stack>
    </Page>
  )
}
