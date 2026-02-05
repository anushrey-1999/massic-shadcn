"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandedKeywords } from "@/hooks/use-branded-keywords";

interface BrandedKeywordsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string | null;
}

export function BrandedKeywordsModal({
  open,
  onOpenChange,
  businessId,
}: BrandedKeywordsModalProps) {
  const { keywords: fetchedKeywords, isLoading, updateKeywords, isUpdating } = useBrandedKeywords(businessId);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);

  useEffect(() => {
    if (fetchedKeywords && JSON.stringify(fetchedKeywords) !== JSON.stringify(keywords)) {
      setKeywords(fetchedKeywords);
    }
  }, [fetchedKeywords]);

  const handleAddKeyword = async () => {
    if (newKeyword.trim()) {
      const updatedKeywords = [...keywords, newKeyword.trim()];
      setKeywords(updatedKeywords);
      setShowAddInput(false);
      setNewKeyword("");
      await updateKeywords(updatedKeywords);
    }
  };

  const handleDeleteKeyword = async (index: number) => {
    const updatedKeywords = keywords.filter((_, i) => i !== index);
    setKeywords(updatedKeywords);
    await updateKeywords(updatedKeywords);
  };

  const handleEditKeyword = (index: number) => {
    setEditingIndex(index);
    setEditValue(keywords[index]);
  };

  const handleSaveEdit = async (index: number) => {
    if (editValue.trim()) {
      const updatedKeywords = [...keywords];
      updatedKeywords[index] = editValue.trim();
      setKeywords(updatedKeywords);
      await updateKeywords(updatedKeywords);
    }
    setEditingIndex(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[544px] p-6 gap-3" showCloseButton={false}>
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="text-xl font-semibold">
            Branded Keywords
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="">
              {showAddInput ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="type keyword here..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddKeyword();
                      } else if (e.key === "Escape") {
                        setShowAddInput(false);
                        setNewKeyword("");
                      }
                    }}
                    className="flex-1"
                    autoFocus
                    disabled={isUpdating}
                  />
                  <Button onClick={handleAddKeyword} disabled={isUpdating}>
                    Add
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAddInput(false);
                      setNewKeyword("");
                    }}
                    variant="outline"
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setShowAddInput(true)}
                  variant="ghost"
                  className="justify-start px-0"
                  disabled={isUpdating}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Keyword
                </Button>
              )}
            </div>

            <div className="space-y-0 max-h-[400px] overflow-y-auto">
              {keywords.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No branded keywords yet. Add one to get started.
                </p>
              ) : (
                keywords.map((keyword, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center justify-between py-2 px-3 transition-colors group border-b border-border",
                      hoveredIndex === index &&
                        editingIndex !== index &&
                        "bg-muted rounded-md",
                    )}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {editingIndex === index ? (
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveEdit(index);
                            } else if (e.key === "Escape") {
                              handleCancelEdit();
                            }
                          }}
                          className="flex-1"
                          autoFocus
                          disabled={isUpdating}
                        />
                        <Button
                          onClick={() => handleSaveEdit(index)}
                          size="sm"
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Save"
                          )}
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          size="sm"
                          variant="outline"
                          disabled={isUpdating}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm text-foreground">{keyword}</span>
                        <div
                          className={cn(
                            "flex gap-2 opacity-0 transition-opacity",
                            hoveredIndex === index && "opacity-100",
                          )}
                        >
                          <button
                            onClick={() => handleEditKeyword(index)}
                            className="p-1 hover:bg-muted-foreground/10 rounded"
                            disabled={isUpdating}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => handleDeleteKeyword(index)}
                            className="p-1 hover:bg-muted-foreground/10 rounded"
                            disabled={isUpdating}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
