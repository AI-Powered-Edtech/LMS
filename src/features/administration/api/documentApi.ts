import { db } from '@/services/db'
import { getStorageProvider } from '@/services/storage'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DocumentCategory =
  | 'surat_masuk'
  | 'surat_keluar'
  | 'sk'
  | 'pengumuman'
  | 'rapor'
  | 'umum'

export type DocumentVisibility = 'admin' | 'teacher' | 'all'

export interface SchoolDocument {
  id: string
  tenant_id: string
  title: string
  description: string | null
  category: DocumentCategory
  file_url: string | null
  file_name: string | null
  file_size: number | null
  file_type: string | null
  visibility: DocumentVisibility
  created_by: string
  created_at: string
  updated_at: string
}

export interface DocumentFilter {
  search?: string
  category?: DocumentCategory | 'all'
  page?: number
  limit?: number
}

export interface DocumentMetadata {
  title: string
  description?: string
  category: DocumentCategory
  visibility: DocumentVisibility
  /** FIXED: tenantId required for storage path isolation — prevents cross-tenant file mixing */
  tenantId?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUCKET = 'school-documents'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
]

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const documentApi = {
  /**
   * Ambil daftar dokumen dengan filter pencarian & kategori.
   */
  async getDocuments(filters: DocumentFilter = {}): Promise<SchoolDocument[]> {
    const { search, category, page = 1, limit = 50 } = filters
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = db
      .from('school_documents')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (search?.trim()) {
      query = query.ilike('title', `%${search.trim()}%`)
    }

    const { data, error } = await query
    if (error) throw new Error(`Gagal memuat dokumen: ${error.message}`)
    return (data ?? []) as SchoolDocument[]
  },

  /**
   * Hitung dokumen per kategori untuk ringkasan.
   * FIXED: Filter by tenant_id to prevent cross-tenant count leakage.
   */
  async getCategoryCounts(tenantId?: string): Promise<Record<DocumentCategory, number>> {
    // FIXED: Add .eq('tenant_id', tenantId) to isolate counts per tenant
    let query = db.from('school_documents').select('category')
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    const { data, error } = await query

    if (error) throw new Error(`Gagal memuat jumlah kategori: ${error.message}`)

    const counts: Record<DocumentCategory, number> = {
      surat_masuk: 0,
      surat_keluar: 0,
      sk: 0,
      pengumuman: 0,
      rapor: 0,
      umum: 0,
    }

    for (const row of data ?? []) {
      const cat = row.category as DocumentCategory
      if (cat in counts) counts[cat]++
    }

    return counts
  },

  /**
   * Upload file ke Supabase Storage dan simpan metadata ke tabel.
   */
  async uploadDocument(file: File, metadata: DocumentMetadata): Promise<SchoolDocument> {
    // Validasi ukuran
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Ukuran file melebihi batas 10MB')
    }

    // Validasi tipe file
    if (!ALLOWED_MIMES.includes(file.type)) {
      throw new Error('Tipe file tidak didukung. Gunakan PDF, Word, Excel, atau gambar.')
    }

    // Dapatkan user
    const {
      data: { user },
    } = await db.auth.getUser()
    if (!user) throw new Error('Pengguna tidak ditemukan')

    // Upload ke Storage
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    // FIXED: Prefix path with tenantId for storage isolation per tenant
    const tenantPrefix = metadata.tenantId ?? 'shared'
    const objectPath = `${tenantPrefix}/${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await getStorageProvider().from(BUCKET).upload(objectPath, file)

    if (uploadError) {
      throw new Error(`Gagal mengunggah file: ${uploadError.message}`)
    }

    // Dapatkan public URL
    const { data: urlData } = getStorageProvider().from(BUCKET).getPublicUrl(objectPath)
    const fileUrl = urlData?.publicUrl || ''

    // Simpan metadata ke tabel
    const { data, error } = await db
      .from('school_documents')
      .insert({
        title: metadata.title,
        description: metadata.description || null,
        category: metadata.category,
        visibility: metadata.visibility,
        file_url: fileUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        created_by: user.id,
      })
      .select('*')
      .single()

    if (error) {
      // Cleanup: hapus file yang sudah diupload
      await getStorageProvider().from(BUCKET).remove([objectPath])
      throw new Error(`Gagal menyimpan dokumen: ${error.message}`)
    }

    return data as SchoolDocument
  },

  /**
   * Update metadata dokumen (tanpa mengganti file).
   */
  async updateDocument(id: string, updates: Partial<DocumentMetadata>): Promise<SchoolDocument> {
    const { data, error } = await db
      .from('school_documents')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw new Error(`Gagal memperbarui dokumen: ${error.message}`)
    return data as SchoolDocument
  },

  /**
   * Hapus dokumen dari tabel dan Storage.
   */
  async deleteDocument(id: string): Promise<void> {
    // Ambil info file dulu
    const { data: doc, error: selectError } = await db
      .from('school_documents')
      .select('file_url')
      .eq('id', id)
      .single()

    if (selectError) throw new Error(`Dokumen tidak ditemukan: ${selectError.message}`)

    // Hapus dari tabel
    const { error: deleteError } = await db.from('school_documents').delete().eq('id', id)

    if (deleteError) throw new Error(`Gagal menghapus dokumen: ${deleteError.message}`)

    // Hapus dari Storage jika ada file
    if (doc?.file_url) {
      try {
        const url = new URL(doc.file_url)
        const pathParts = url.pathname.split(`/${BUCKET}/`)
        if (pathParts[1]) {
          await getStorageProvider().from(BUCKET).remove([pathParts[1]])
        }
      } catch {
        // Jika parsing URL gagal, tetap lanjut (file di storage mungkin sudah hilang)
      }
    }
  },
}
