import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function unauthorized() {
  return err("Não autenticado", 401);
}

export function forbidden() {
  return err("Sem permissão", 403);
}

export function notFound(what = "Recurso não encontrado") {
  return err(what, 404);
}
