"use client";

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { io, Socket } from 'socket.io-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import Image from 'next/image';

interface QRModalProps {
  deviceId: string;
  deviceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected?: () => void;
}

export function QRModal({ deviceId, deviceName, open, onOpenChange, onConnected }: QRModalProps) {
  const t = useTranslations('Devices');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'waiting' | 'connected' | 'expired'>('waiting');
  const [socket, setSocket] = useState<Socket | null>(null);

  const connect = useCallback(() => {
    if (!open || !deviceId) return;

    setQrCode(null);
    setStatus('waiting');

    const newSocket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    newSocket.on('connect', () => {
      newSocket.emit('join-device', deviceId);
    });

    newSocket.on('qr', (qr: string) => {
      setQrCode(qr);
      setStatus('waiting');
    });

    newSocket.on('device-connected', () => {
      setStatus('connected');
      onConnected?.();
      setTimeout(() => onOpenChange(false), 2000);
    });

    newSocket.on('disconnect', () => {
      setStatus('expired');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [open, deviceId, onConnected, onOpenChange]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
      socket?.disconnect();
    };
  }, [open, deviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    socket?.disconnect();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('scanQR')} — {deviceName}</DialogTitle>
          <DialogDescription>{t('scanQRDesc')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {status === 'connected' ? (
            <div className="flex flex-col items-center gap-2 text-green-600">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold">{t('connected')}</p>
            </div>
          ) : qrCode ? (
            <div className="relative">
              <Image
                src={qrCode}
                alt="QR Code"
                width={256}
                height={256}
                className="rounded-lg border"
                unoptimized
              />
              {status === 'expired' && (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-lg gap-2">
                  <p className="text-sm">{t('qrExpired')}</p>
                  <Button size="sm" onClick={connect} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="w-64 h-64 flex items-center justify-center border rounded-lg bg-muted">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">{t('waitingQR')}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
