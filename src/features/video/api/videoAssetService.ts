import { db } from '@/services/db'

import type { VideoAsset } from '../types'

const VIDEO_ASSET_COLUMNS =
  'id, lesson_id, block_id, provider, provider_asset_id, playback_id, status, duration_seconds, resolution, thumbnail_url, hls_url, dash_url, mp4_url, original_filename, file_size_bytes, metadata, error_message, tenant_id, created_by, created_at, updated_at'

export const videoAssetService = {
  async getByBlockId(blockId: string, tenantId: string): Promise<VideoAsset | null> {
    const { data, error } = await db
      .from('video_assets')
      .select(VIDEO_ASSET_COLUMNS)
      .eq('block_id', blockId)
      .eq('tenant_id', tenantId)
      .eq('status', 'ready')
      .maybeSingle()
    if (error) throw error
    return data
  },

  async getByLessonId(lessonId: string, tenantId: string): Promise<VideoAsset[]> {
    const { data, error } = await db
      .from('video_assets')
      .select(VIDEO_ASSET_COLUMNS)
      .eq('lesson_id', lessonId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw error
    return data || []
  },

  async createAsset(asset: Partial<VideoAsset>): Promise<VideoAsset> {
    const { data, error } = await db
      .from('video_assets')
      .insert({
        lesson_id: asset.lesson_id ?? null,
        block_id: asset.block_id ?? null,
        provider: asset.provider ?? 'direct',
        original_filename: asset.original_filename ?? null,
        file_size_bytes: asset.file_size_bytes ?? null,
        metadata: asset.metadata ?? {},
        status: 'processing',
      })
      .select(VIDEO_ASSET_COLUMNS)
      .single()
    if (error) throw error
    return data
  },

  async updateAssetStatus(
    assetId: string,
    status: string,
    extra?: Partial<VideoAsset>
  ): Promise<void> {
    const { error } = await db
      .from('video_assets')
      .update({ status, ...extra, updated_at: new Date().toISOString() })
      .eq('id', assetId)
    if (error) throw error
  },

  async deleteAsset(assetId: string, tenantId: string): Promise<void> {
    const { error } = await db
      .from('video_assets')
      .update({ status: 'deleted' })
      .eq('id', assetId)
      .eq('tenant_id', tenantId)
    if (error) throw error
  },
}
