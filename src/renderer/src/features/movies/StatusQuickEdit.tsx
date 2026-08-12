import { Eye, Heart } from '@phosphor-icons/react'
import { UserRecord } from '@archiedia/schema'
import { updateUserRecord } from './api'

interface Props {
  record: UserRecord
  onChange: (updated: UserRecord) => void
}

function withoutStatusTags(tags: string[]): string[] {
  return tags.filter((t) => t !== '보고싶음' && !/^\d+번 봄$/.test(t))
}

export function StatusQuickEdit({ record, onChange }: Props): React.JSX.Element {
  const isWishlist = record.tags.includes('보고싶음')

  async function toggleWishlist(e: React.MouseEvent): Promise<void> {
    e.stopPropagation()
    const tags = isWishlist
      ? withoutStatusTags(record.tags)
      : [...withoutStatusTags(record.tags), '보고싶음']
    await updateUserRecord(record.id, { tags })
    onChange({ ...record, tags })
  }

  async function markWatched(e: React.MouseEvent): Promise<void> {
    e.stopPropagation()
    const nextCount = record.watchCount + 1
    const tags = [...withoutStatusTags(record.tags), `${nextCount}번 봄`]
    const today = new Date().toISOString().slice(0, 10)
    const patch = { watchCount: nextCount, tags, lastWatchedAt: today }
    await updateUserRecord(record.id, patch)
    onChange({ ...record, ...patch })
  }

  return (
    <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ padding: 4 }}
        title={isWishlist ? '보고싶음 해제' : '보고싶음으로 표시'}
        onClick={toggleWishlist}
      >
        <Heart size={14} weight={isWishlist ? 'fill' : 'regular'} />
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ padding: 4 }}
        title="관람 기록 추가 (+1)"
        onClick={markWatched}
      >
        <Eye size={14} />
      </button>
    </div>
  )
}
