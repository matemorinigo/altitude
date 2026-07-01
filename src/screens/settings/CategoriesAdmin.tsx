import { useState } from 'react'
import { SectionLabel } from '../../components/shell/SectionLabel'
import { useCategories, useAddCategory, useUpdateCategory, useDeleteCategory } from '../../hooks/useCategories'
import type { Category } from '../../hooks/useCategories'
import { useToast } from '../../context/ToastContext'

interface Props {
  onBack: () => void
}

const inputStyle: React.CSSProperties = {
  background: '#050505', border: '1px solid var(--line-2)',
  color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 12,
  letterSpacing: '0.04em', padding: '10px 12px', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

export function CategoriesAdmin({ onBack }: Props) {
  const { data: categories = [], isLoading } = useCategories()
  const addCategory    = useAddCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const toast          = useToast()

  const userCategories = categories.filter(c => !c.is_system)

  const [showForm, setShowForm] = useState(false)
  const [code, setCode]         = useState('')
  const [label, setLabel]       = useState('')
  const [kind, setKind]         = useState<'EXPENSE' | 'INCOME'>('EXPENSE')
  const [err, setErr]           = useState('')

  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editLabel, setEditLabel]     = useState('')

  const handleAdd = async () => {
    if (!code.trim() || !label.trim()) { setErr('CODE Y LABEL REQUERIDOS'); return }
    setErr('')
    try {
      await addCategory.mutateAsync({ code: code.trim(), label: label.trim(), kind })
      setCode(''); setLabel(''); setShowForm(false)
      toast('CATEGORÍA CREADA', 'var(--grn)')
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'ERROR')
    }
  }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditLabel(cat.label)
  }

  const commitEdit = async (id: string) => {
    if (!editLabel.trim()) return
    await updateCategory.mutateAsync({ id, label: editLabel.trim() })
    setEditingId(null)
    toast('ACTUALIZADO', 'var(--grn)')
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory.mutateAsync(id)
      toast('CATEGORÍA ELIMINADA', 'var(--amb)')
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'ERROR', 'var(--red)')
    }
  }

  return (
    <div className="scroll" style={{ padding: '0 14px 20px' }}>
      {/* Back header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0', borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
      }}>
        <span onClick={onBack} style={{ color: 'var(--amb)', cursor: 'pointer' }}>← BACK</span>
        <span style={{ color: 'var(--ink-3)' }}>CATEGORIES · ADMIN</span>
      </div>

      <SectionLabel right={`${userCategories.length} OBJ`}>CATEGORÍAS</SectionLabel>

      {isLoading && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', padding: '8px 0' }}>
          LOADING...
        </div>
      )}

      {userCategories.map(cat => (
        <div key={cat.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10, marginBottom: 10 }}>
          <div className="row" style={{ gridTemplateColumns: 'auto 1fr auto', borderBottom: 0, paddingBottom: 0 }}>
            <div style={{
              width: 36, height: 36, border: '1px solid var(--line-2)', background: '#080808',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-2)',
            }}>{cat.code.slice(0, 4)}</div>
            <div>
              {editingId === cat.id ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    autoFocus
                    style={{ ...inputStyle, flex: 1, fontSize: 11, padding: '6px 10px' }}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(cat.id); if (e.key === 'Escape') setEditingId(null) }}
                  />
                  <span
                    onClick={() => commitEdit(cat.id)}
                    style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--grn)', cursor: 'pointer', letterSpacing: '0.1em' }}
                  >OK</span>
                </div>
              ) : (
                <>
                  <div className="name" onClick={() => startEdit(cat)} style={{ cursor: 'pointer' }}>{cat.label}</div>
                  <div className="sub">{cat.kind}</div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <div className={`chip ${cat.kind === 'EXPENSE' ? '' : 'on'}`} style={{ fontSize: 8, padding: '2px 6px' }}>
                {cat.kind === 'EXPENSE' ? 'EXP' : 'INC'}
              </div>
              <div
                style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--red)', cursor: 'pointer', letterSpacing: '0.1em' }}
                onClick={() => handleDelete(cat.id)}
              >
                DEL
              </div>
            </div>
          </div>
        </div>
      ))}

      {userCategories.length === 0 && !isLoading && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.14em', padding: '8px 0' }}>
          NO CATEGORIES
        </div>
      )}

      <SectionLabel right="NEW">AGREGAR CATEGORÍA</SectionLabel>

      {!showForm ? (
        <button className="btn-trigger" onClick={() => setShowForm(true)} style={{ padding: '14px 18px' }}>
          <span style={{ fontSize: 11, letterSpacing: '0.22em' }}>+ ADD CATEGORY</span>
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="CODE (PETS, SUBS...)" style={inputStyle} maxLength={15} />
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="LABEL (MASCOTAS, SUSCRIPCIONES...)" style={inputStyle} maxLength={20} />

          <div style={{ display: 'flex', gap: 6 }}>
            {(['EXPENSE', 'INCOME'] as const).map(k => (
              <div key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
                {k === 'EXPENSE' ? 'EGRESO' : 'INGRESO'}
              </div>
            ))}
          </div>

          {err && (
            <div style={{ border: '1px solid var(--red)', color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 10, padding: '8px 12px', letterSpacing: '0.14em' }}>
              ✕ {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-trigger" onClick={handleAdd} disabled={addCategory.isPending} style={{ padding: '12px 18px' }}>
              <span style={{ fontSize: 11, letterSpacing: '0.22em' }}>{addCategory.isPending ? 'SAVING...' : '▶ CONFIRM'}</span>
            </button>
            <button
              onClick={() => { setShowForm(false); setErr('') }}
              style={{
                background: 'transparent', border: '1px solid var(--line-2)',
                color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontSize: 11,
                letterSpacing: '0.18em', padding: '12px 18px', cursor: 'pointer',
              }}
            >
              ESC
            </button>
          </div>
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  )
}
