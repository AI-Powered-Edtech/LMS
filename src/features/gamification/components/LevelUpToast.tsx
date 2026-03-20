import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/contexts/AuthContext';
import { useToast } from '@/src/contexts/ToastContext';
import { gamificationKeys } from '../queries/gamificationQueries';
import type { StudentXPProfile } from '../types';

/**
 * LevelUpToast — watches XP profile query and toasts when level changes.
 * Mount once in a top-level layout.
 */
export function LevelUpToast() {
    const { user, tenantId } = useAuth();
    const { toast } = useToast();
    const qc = useQueryClient();
    const prevLevelRef = useRef<number | null>(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!user?.id || !tenantId) {
            initializedRef.current = false;
            prevLevelRef.current = null;
            return;
        }

        const key = gamificationKeys.xpProfile(tenantId, user.id);

        const unsubscribe = qc.getQueryCache().subscribe((event) => {
            if (event.type !== 'updated' || event.action.type !== 'success') return;

            const queryKey = event.query.queryKey;
            if (JSON.stringify(queryKey) !== JSON.stringify(key)) return;

            const profile = event.action.data as StudentXPProfile | null | undefined;
            if (!profile) return;

            if (!initializedRef.current) {
                prevLevelRef.current = profile.level;
                initializedRef.current = true;
                return;
            }

            if (prevLevelRef.current !== null && profile.level > prevLevelRef.current) {
                toast(
                    `🎉 Level Up! Kamu sekarang Level ${profile.level}!`,
                    'success',
                    5000,
                );
            }
            prevLevelRef.current = profile.level;
        });

        return unsubscribe;
    }, [user?.id, tenantId, qc, toast]);

    return null;
}
