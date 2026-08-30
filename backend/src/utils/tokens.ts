import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Role } from "@el-tesoro/shared";
import { env } from "../config/env";

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessTtlMinutes * 60 });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

/// Tokens opacos (verificación de correo, reset de contraseña, refresh):
/// el valor crudo se entrega al usuario (correo o cookie) y solo su hash
/// sha256 se guarda en la base — así una fuga de la base de datos no expone
/// tokens utilizables.
export function generateOpaqueToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  return { raw, hash: hashOpaqueToken(raw) };
}

export function hashOpaqueToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
