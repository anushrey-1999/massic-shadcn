"use client";

import React, { FormEvent, useMemo, useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api, getBaseURLByPlatform } from "@/hooks/use-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableElement,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Typography } from "@/components/ui/typography";

type McpToken = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

type CreatedToken = {
  token: string;
  metadata: McpToken;
};

const MCP_TOKENS_QUERY_KEY = ["mcp-personal-access-tokens"];

function getErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return "Something went wrong. Please try again.";
  const payload = error.response?.data as { message?: string; error?: string } | undefined;
  return payload?.message || payload?.error || "Something went wrong. Please try again.";
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function tokenStatus(token: McpToken): "active" | "expired" | "revoked" {
  if (token.revokedAt) return "revoked";
  if (new Date(token.expiresAt).getTime() <= Date.now()) return "expired";
  return "active";
}

function StatusBadge({ token }: { token: McpToken }) {
  const status = tokenStatus(token);
  if (status === "active") {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
  }
  if (status === "expired") {
    return <Badge variant="secondary">Expired</Badge>;
  }
  return <Badge variant="destructive">Revoked</Badge>;
}

async function copyText(value: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  } catch {
    toast.error("Could not copy to the clipboard");
  }
}

export function McpAccessSettings() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("90");
  const [createdToken, setCreatedToken] = useState<CreatedToken | null>(null);

  const mcpEndpoint = useMemo(
    () => getBaseURLByPlatform("node").replace(/\/api\/1\/?$/, "/mcp"),
    []
  );

  const tokensQuery = useQuery({
    queryKey: MCP_TOKENS_QUERY_KEY,
    queryFn: () => api.get<{ tokens: McpToken[] }>("/mcp/tokens", "node"),
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: (input: { name: string; expiresInDays: number }) =>
      api.post<CreatedToken>("/mcp/tokens", "node", input),
    onSuccess: async (result) => {
      setCreatedToken(result);
      await queryClient.invalidateQueries({ queryKey: MCP_TOKENS_QUERY_KEY });
      toast.success("AI access token created");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const revokeMutation = useMutation({
    mutationFn: (tokenId: string) => api.delete(`/mcp/tokens/${tokenId}`, "node"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: MCP_TOKENS_QUERY_KEY });
      toast.success("Token revoked");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  function resetDialog() {
    setDialogOpen(false);
    setName("");
    setExpiresInDays("90");
    setCreatedToken(null);
    createMutation.reset();
  }

  function handleDialogChange(open: boolean) {
    if (open) setDialogOpen(true);
    else resetDialog();
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName) return;
    createMutation.mutate({
      name: normalizedName,
      expiresInDays: Number(expiresInDays),
    });
  }

  const tokens = tokensQuery.data?.tokens ?? [];

  return (
    <div className="space-y-6">
      <Card variant="profileCard" className="border-none bg-white p-4">
        <CardHeader className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <CardTitle>
              <Typography variant="h4">AI analytics access</Typography>
            </CardTitle>
            <p className="max-w-2xl text-sm text-general-muted-foreground">
              Create a personal token to let an MCP-compatible AI assistant read analytics for
              businesses you can access. Tokens cannot change Massic data or Google connections.
            </p>
          </div>
          <Button className="shrink-0" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create token
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 rounded-lg border border-general-border bg-muted/30 p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-general-foreground">
                <ShieldCheck className="h-4 w-4" />
                MCP server endpoint
              </div>
              <code className="block break-all rounded-md bg-white px-3 py-2 text-sm text-general-unofficial-foreground-alt">
                {mcpEndpoint}
              </code>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => copyText(mcpEndpoint, "MCP endpoint copied")}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy endpoint
            </Button>
          </div>

          {tokensQuery.isLoading ? (
            <div className="flex items-center justify-center py-12" aria-live="polite">
              <Loader2 className="h-6 w-6 animate-spin text-general-muted-foreground" />
              <span className="sr-only">Loading AI access tokens</span>
            </div>
          ) : tokensQuery.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm text-destructive">{getErrorMessage(tokensQuery.error)}</p>
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                onClick={() => tokensQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : tokens.length === 0 ? (
            <div className="rounded-lg border border-dashed border-general-border px-4 py-12 text-center">
              <KeyRound className="mx-auto mb-3 h-6 w-6 text-general-muted-foreground" />
              <p className="text-sm font-medium text-general-foreground">No AI access tokens</p>
              <p className="mt-1 text-sm text-general-muted-foreground">
                Create one when you are ready to connect an AI assistant.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-general-border">
              <Table>
                <TableElement className="min-w-[820px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Name</TableHead>
                      <TableHead>Token prefix</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Last used</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens.map((token) => {
                      const status = tokenStatus(token);
                      const isRevoking =
                        revokeMutation.isPending && revokeMutation.variables === token.id;
                      return (
                        <TableRow key={token.id}>
                          <TableCell className="font-medium">{token.name}</TableCell>
                          <TableCell>
                            <code className="text-xs text-general-muted-foreground">
                              {token.prefix}…
                            </code>
                          </TableCell>
                          <TableCell><StatusBadge token={token} /></TableCell>
                          <TableCell className="text-general-muted-foreground">
                            {formatDate(token.createdAt)}
                          </TableCell>
                          <TableCell className="text-general-muted-foreground">
                            {formatDate(token.expiresAt)}
                          </TableCell>
                          <TableCell className="text-general-muted-foreground">
                            {formatDate(token.lastUsedAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            {status === "active" ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isRevoking}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    {isRevoking ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="mr-2 h-4 w-4" />
                                    )}
                                    {isRevoking ? "Revoking" : "Revoke"}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Revoke {token.name}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Any AI client using this token will lose access immediately.
                                      This cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Keep token</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-white hover:bg-destructive/90"
                                      onClick={() => revokeMutation.mutate(token.id)}
                                    >
                                      Revoke token
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <span className="text-sm text-general-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </TableElement>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-xl">
          {createdToken ? (
            <>
              <DialogHeader>
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-green-100 text-green-800">
                  <Check className="h-5 w-5" />
                </div>
                <DialogTitle>Copy your token now</DialogTitle>
                <DialogDescription>
                  For security, Massic will not show this token again. Save it in your AI
                  client&apos;s secret storage, then use it as a Bearer token.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border border-general-border bg-muted/40 p-3">
                <code className="block break-all text-sm text-general-foreground">
                  {createdToken.token}
                </code>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetDialog}>Done</Button>
                <Button
                  onClick={() => copyText(createdToken.token, "Token copied")}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy token
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={handleCreate} className="space-y-5">
              <DialogHeader>
                <DialogTitle>Create AI access token</DialogTitle>
                <DialogDescription>
                  Use a separate token for each AI client so you can revoke access independently.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="mcp-token-name">Token name</Label>
                <Input
                  id="mcp-token-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={64}
                  autoComplete="off"
                  placeholder="Claude Desktop"
                  disabled={createMutation.isPending}
                  required
                />
                <p className="text-xs text-general-muted-foreground">
                  Name the app or device that will use this token.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mcp-token-expiry">Expires after</Label>
                <Select
                  value={expiresInDays}
                  onValueChange={setExpiresInDays}
                  disabled={createMutation.isPending}
                >
                  <SelectTrigger id="mcp-token-expiry">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days · Recommended</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-general-muted-foreground">
                  Shorter-lived tokens reduce risk if a client or device is compromised.
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetDialog} disabled={createMutation.isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {createMutation.isPending ? "Creating" : "Create token"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
