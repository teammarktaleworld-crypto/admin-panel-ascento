import { NextRequest, NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/constants";

function buildTargetUrl(request: NextRequest, path: string[]) {
  const joined = path.join("/");
  const search = request.nextUrl.search || "";
  return `${API_BASE_URL}/${joined}${search}`;
}

async function forward(request: NextRequest, path: string[]) {
  const targetUrl = buildTargetUrl(request, path);
  const method = request.method;

  const outboundHeaders = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");
  const sessionKey = request.headers.get("x-session-key");
  const authorization = request.headers.get("authorization");

  if (contentType) {
    outboundHeaders.set("content-type", contentType);
  }
  if (accept) {
    outboundHeaders.set("accept", accept);
  }
  if (sessionKey) {
    outboundHeaders.set("x-session-key", sessionKey);
  }
  if (authorization) {
    outboundHeaders.set("authorization", authorization);
  }

  const body = method === "GET" || method === "HEAD" ? undefined : await request.text();

  const response = await fetch(targetUrl, {
    method,
    headers: outboundHeaders,
    body,
    cache: "no-store",
  });

  const responseText = await response.text();
  const responseHeaders = new Headers();
  const responseContentType = response.headers.get("content-type");

  if (responseContentType) {
    responseHeaders.set("content-type", responseContentType);
  }

  return new NextResponse(responseText, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path);
}
