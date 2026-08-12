import { Heart } from '@phosphor-icons/react'
import { UserRecord } from '@archiedia/schema'
import { updateUserRecord } from './api'
import { isWishlisted, withoutStatusTags } from './wishlist'

interface Props {
  record: UserRecord
  onChange: (updated: UserRecord) => void
}

export function StatusQuickEdit({ record, onChange }: Props): React.JSX.Element {
  const isWishlist = isWishlisted(record.tags)

  async function toggleWishlist(e: React.MouseEvent): Promise<void> {
    e.stopPropagation()
    const tags = isWishlist
      ? withoutStatusTags(record.tags)
      : [...withoutStatusTags(record.tags), '보고 싶음']
    await updateUserRecord(record.id, { tags })
    onChange({ ...record, tags })
  }

  return (
    <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ padding: 4 }}
        onClick={toggleWishlist}
      >
        <Heart size={14} weight={isWishlist ? 'fill' : 'regular'} />
      </button>
    </div>
  )
}
