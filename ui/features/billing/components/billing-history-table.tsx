"use client";

import type { BillingEventRecord } from "@enterprise/core/services/billing-service";
import { Button } from "@enterprise/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@enterprise/ui/components/table";
import { useState } from "react";
import { getBillingHistoryQuery } from "@/features/billing/queries";

const PAGE_SIZE = 50;

interface BillingHistoryTableProps {
  initialHistory: BillingEventRecord[];
  tenantId: string;
}

export function BillingHistoryTable({ initialHistory, tenantId }: BillingHistoryTableProps) {
  const [history, setHistory] = useState(initialHistory);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const hasPrev = offset > 0;
  const hasNext = history.length === PAGE_SIZE;

  async function loadPage(newOffset: number) {
    setIsLoading(true);
    try {
      const data = await getBillingHistoryQuery(tenantId, {
        limit: PAGE_SIZE,
        offset: newOffset,
      });
      setHistory(data);
      setOffset(newOffset);
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatEventType(eventType: string) {
    return eventType.replace(/\./g, " › ").replace(/_/g, " ");
  }

  if (history.length === 0 && offset === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Billing history</h2>
        <p className="text-sm text-muted-foreground">No billing events yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Billing history</h2>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Event type</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="text-muted-foreground">{formatDate(event.createdAt)}</TableCell>
              <TableCell className="capitalize">{formatEventType(event.eventType)}</TableCell>
              <TableCell className="capitalize">{event.provider}</TableCell>
              <TableCell className="text-muted-foreground">
                {event.processedAt ? "Processed" : "Pending"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {(hasPrev || hasNext) && (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasPrev || isLoading}
            onClick={() => loadPage(offset - PAGE_SIZE)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasNext || isLoading}
            onClick={() => loadPage(offset + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
