import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('logo') || formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'No se ha proporcionado ningún archivo de imagen válido.' },
        { status: 400 }
      );
    }

    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo permitido de 2MB.' },
        { status: 413 }
      );
    }

    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato inválido. Solo se admiten archivos PNG, JPEG y SVG.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sobrescribe directamente en process.cwd() + '/public/logo-institucional.png'
    const targetPath = path.resolve(process.cwd(), 'public/logo-institucional.png');
    fs.writeFileSync(targetPath, buffer);

    // Mantiene compatibilidad con public/logo.png
    try {
      fs.writeFileSync(path.resolve(process.cwd(), 'public/logo.png'), buffer);
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Logo institucional actualizado correctamente en el servidor.',
      url: '/logo-institucional.png',
    });
  } catch (error: any) {
    console.error('[Upload-Logo API Route Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor al procesar el archivo.' },
      { status: 500 }
    );
  }
}
