"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableElement,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Typography } from "@/components/ui/typography";
import { EmptyState } from "@/components/molecules/EmptyState";
import { Plus, Copy, Eye, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAccessRequests } from "@/hooks/use-access-requests";
import { PRODUCT_CONFIG, STATUS_CONFIG } from "@/config/access-request";
import { CreateAccessRequestDialog } from "./CreateAccessRequestDialog";
import { AccessRequestDetail } from "./AccessRequestDetail";
import type { AccessRequest, Product } from "@/types/access-request";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <Badge variant={config.variant} className={cn("text-xs", config.className)}>
      {config.label}
    </Badge>
  );
}

function ProductBadges({ products }: { products: Product[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {products.map((product) => (
        <Badge
          key={product}
          variant="outline"
          className="text-[11px] font-medium border-general-border"
        >
          {PRODUCT_CONFIG[product]?.shortLabel || product.toUpperCase()}
        </Badge>
      ))}
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function copyRequestLink(request: AccessRequest) {
  const url = request.requestUrl || `${window.location.origin}/google-access/r/${request.token}`;
  navigator.clipboard.writeText(url);
  toast.success("Link copied to clipboard");
}

export function AccessRequestSettings() {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState<AccessRequest | null>(null);
  const { data, isLoading } = useAccessRequests(page, 20);

  const requests = data?.requests || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <Card variant="profileCard" className="p-4 bg-white border-none">
        <CardHeader className="pb-6 flex flex-row items-center justify-between">
          <CardTitle>
            <Typography variant="h4">Access Requests</Typography>
          </CardTitle>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Request
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-general-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              title="No access requests yet"
              description="Create a request to generate a link your clients can use to grant access to their Google accounts."
              cardClassName="bg-white"
              buttons={[
                {
                  label: "Create Request",
                  onClick: () => setCreateOpen(true),
                  variant: "default",
                },
              ]}
            />
          ) : (
            <>
              <div className="rounded-lg border border-general-border overflow-hidden">
                <Table>
                  <TableElement>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs font-medium">Agency Email</TableHead>
                        <TableHead className="text-xs font-medium">Products</TableHead>
                        <TableHead className="text-xs font-medium">Status</TableHead>
                        <TableHead className="text-xs font-medium">Created</TableHead>
                        <TableHead className="text-xs font-medium">Expires</TableHead>
                        <TableHead className="text-xs font-medium text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => (
                        <TableRow key={request.id} className="hover:bg-muted/30">
                          <TableCell className="text-sm font-mono text-general-unofficial-foreground-alt">
                            {request.agencyEmail}
                          </TableCell>
                          <TableCell>
                            <ProductBadges products={request.products} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={request.status} />
                          </TableCell>
                          <TableCell className="text-sm text-general-muted-foreground">
                            {formatDate(request.createdAt)}
                          </TableCell>
                          <TableCell className="text-sm text-general-muted-foreground">
                            {formatDate(request.expiresAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => copyRequestLink(request)}
                                title="Copy link"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setDetailRequest(request)}
                                title="View details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </TableElement>
                </Table>
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-general-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CreateAccessRequestDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      <AccessRequestDetail
        request={detailRequest}
        onClose={() => setDetailRequest(null)}
      />
    </div>
  );
}
