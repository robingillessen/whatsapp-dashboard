// app/components/DynamicFavicon.tsx
'use client';

import { useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function DynamicFavicon() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    // Maak browser client met SSR
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        const updateFavicon = async () => {
            // Haal totaal aantal ongelezen berichten op
            const { data: contacts, error } = await supabase
                .from('contacts')
                .select('unread_count')
                .gt('unread_count', 0);

            if (error) {
                console.error('Error fetching unread count:', error);
                return;
            }

            const totalUnread = contacts?.reduce((sum, contact) => sum + (contact.unread_count || 0), 0) || 0;

            // Maak canvas voor favicon
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Clear canvas
            ctx.clearRect(0, 0, 32, 32);

            // Teken basis favicon (WhatsApp groen)
            ctx.fillStyle = '#25D366';
            ctx.beginPath();
            ctx.arc(16, 16, 16, 0, Math.PI * 2);
            ctx.fill();

            // Teken WhatsApp logo
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(16, 16, 8, 0, Math.PI * 2);
            ctx.fill();

            // Als er ongelezen berichten zijn, teken badge
            if (totalUnread > 0) {
                // Teken rode cirkel
                ctx.fillStyle = '#FF3B30';
                ctx.beginPath();
                ctx.arc(24, 8, 8, 0, Math.PI * 2);
                ctx.fill();

                // Teken nummer
                ctx.fillStyle = 'white';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const text = totalUnread > 99 ? '99+' : totalUnread.toString();
                ctx.fillText(text, 24, 8);
            }

            // Update favicon
            const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
            if (link) {
                link.href = canvas.toDataURL('image/png');
            }
        };

        // Update favicon bij laden
        updateFavicon();

        // Subscribe voor real-time updates
        const channel = supabase
            .channel('unread_messages')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'contacts' 
                }, 
                () => {
                    updateFavicon();
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [supabase]);

    return (
        <canvas 
            ref={canvasRef} 
            width="32" 
            height="32" 
            style={{ display: 'none' }} 
        />
    );
}