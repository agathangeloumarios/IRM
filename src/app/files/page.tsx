"use client";

import * as React from "react";
import { useState, useMemo, useRef } from "react";
import {
  Upload, Download, FolderOpen, FileText, FileSpreadsheet, FileCode2,
  FileImage, File as FileIcon, MoreHorizontal, Search, Plus, Lock, Unlock,
  Copy, Trash2, ArrowUp, ArrowDown, FileUp, ClipboardList, Stethoscope,
  CheckCircle2, AlertCircle, Settings2, ImagePlus, X,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { files as miscFiles } from "@/lib/mock-data";
import { formatDate, cn } from "@/lib/utils";
import {
  useTemplates, TemplateCategory, ReportTemplate,
  TemplateChrome, resolveChrome, PRACTICE_DEFAULTS,
} from "@/lib/template-store";

const iconFor = (ext: string) => {
  switch (ext) {
    case "json":
    case "xml": return FileCode2;
    case "xlsx":
    case "csv": return FileSpreadsheet;
    case "docx":
    case "txt": return FileText;
    case "jpg":
    case "jpeg":
    case "png": return FileImage;
    case "pdf": return FileText;
    default: return FileIcon;
  }
};

const typeColor: Record<string, any> = {
  template: "primary",
  backup: "success",
  report: "warning",
  import: "outline",
};

const categoryLabel: Record<TemplateCategory, string> = {
  consultation: "Consultation",
  discharge: "Discharge",
};

export default function FilesPage() {
  const {
    templates, deleteTemplate, duplicateTemplate, lockTemplate, reorderTemplates,
    exportJson, importJson, uploadFileAsTemplate, updateTemplate,
  } = useTemplates();

  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingCategory, setPendingCategory] = useState<TemplateCategory>("consultation");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (tab === "consultation" || tab === "discharge") return t.category === tab;
      if (tab === "template" || tab === "all") return true;
      return false;
    });
  }, [templates, q, tab]);

  const filteredMisc = useMemo(
    () =>
      miscFiles.filter(
        (f) =>
          (!q || f.name.toLowerCase().includes(q.toLowerCase())) &&
          (tab === "all" || f.type === tab)
      ),
    [q, tab]
  );

  const openUploadFor = (file: File) => {
    setPendingFile(file);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadOpen(true);
  };

  const onDropFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const f = fileList[0];
    if (!/\.(docx|pdf|txt|md)$/i.test(f.name)) {
      setUploadError("Only .docx, .pdf, .txt, .md are supported for templates.");
      setUploadOpen(true);
      return;
    }
    openUploadFor(f);
  };

  const confirmUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const tpl = await uploadFileAsTemplate(pendingFile, pendingCategory);
      setUploadSuccess(`Imported "${tpl.name}" as ${categoryLabel[pendingCategory]} template.`);
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e: any) {
      setUploadError(e?.message || "Failed to import file");
    } finally {
      setUploading(false);
    }
  };

  const handleExport = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `irm-templates-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleJsonImport = async (file: File) => {
    const text = await file.text();
    const res = importJson(text, "merge");
    if (res.ok) {
      setUploadSuccess(`Imported ${res.count ?? 0} templates from ${file.name}.`);
      setUploadError(null);
    } else {
      setUploadError(res.error || "Failed to import JSON");
      setUploadSuccess(null);
    }
    setUploadOpen(true);
    if (jsonInputRef.current) jsonInputRef.current.value = "";
  };

  return (
    <PageShell
      title="File Manager"
      subtitle="Document management · template backups · JSON export/import · practice-wide organization"
      actions={
        <>
          <input
            ref={jsonInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleJsonImport(f);
            }}
          />
          <Button variant="outline" size="sm" onClick={() => jsonInputRef.current?.click()}>
            <FileUp className="h-4 w-4" /> Import JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export JSON
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.pdf,.txt,.md"
            hidden
            onChange={(e) => onDropFiles(e.target.files)}
          />
          <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Upload Template
          </Button>
        </>
      }
    >
      <Card
        className="border-dashed border-border hover:border-primary-foreground/30 transition-colors"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onDropFiles(e.dataTransfer.files);
        }}
      >
        <CardContent className="p-10 flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-md bg-primary-foreground/10 border border-primary-foreground/30 flex items-center justify-center">
            <Upload className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="mt-4 text-sm font-medium text-foreground">
            Drop a Word or PDF here to clone as a report template
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Creates the basic structure &amp; layout · assign to Consultation or Discharge
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <FolderOpen className="h-4 w-4" /> Browse
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setPendingFile(null);
                setUploadError(null);
                setUploadSuccess(null);
                setUploadOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> New Template
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="template">All Templates</TabsTrigger>
            <TabsTrigger value="consultation">Consultation</TabsTrigger>
            <TabsTrigger value="discharge">Discharge</TabsTrigger>
            <TabsTrigger value="backup">Backups</TabsTrigger>
            <TabsTrigger value="report">Reports</TabsTrigger>
            <TabsTrigger value="import">Imports</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search files & templates..."
            className="pl-9"
          />
        </div>
      </div>

      {(tab === "all" || tab === "template" || tab === "consultation" || tab === "discharge") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Report Templates ({filteredTemplates.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border bg-card/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Template</th>
                    <th className="px-4 py-3 text-left font-medium">Category</th>
                    <th className="px-4 py-3 text-left font-medium">Source</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Updated</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTemplates.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No templates match. Upload a .docx or .pdf to get started.
                      </td>
                    </tr>
                  )}
                  {filteredTemplates.map((t) => (
                    <TemplateRow
                      key={t.id}
                      t={t}
                      onLock={() => lockTemplate(t.id, !t.locked)}
                      onDuplicate={() => duplicateTemplate(t.id)}
                      onDelete={() => deleteTemplate(t.id)}
                      onMoveUp={() => reorderTemplates(t.id, "up")}
                      onMoveDown={() => reorderTemplates(t.id, "down")}
                      onRename={(name) => updateTemplate(t.id, { name })}
                      onChangeCategory={(category) => updateTemplate(t.id, { category })}
                      onSaveCustom={(patch) => updateTemplate(t.id, patch)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {(tab === "all" || tab === "backup" || tab === "report" || tab === "import") && (
        <Card>
          <CardHeader><CardTitle>Files ({filteredMisc.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border bg-card/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Size</th>
                    <th className="px-4 py-3 text-left font-medium">Updated</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredMisc.map((f) => {
                    const Icon = iconFor(f.ext);
                    return (
                      <tr key={f.id} className="hover:bg-card/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-card border border-border flex items-center justify-center">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="text-foreground font-medium">{f.name}</div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">.{f.ext}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={typeColor[f.type] || "outline"}>{f.type}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{f.size}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDate(f.updated)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import report template</DialogTitle>
            <DialogDescription>
              Clone the structure of a Word or PDF document into a reusable report template.
              Placeholders like <code className="font-mono">{"{{BeneficiaryName}}"}</code> will be
              auto-filled in Consultation or Discharge Reports.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!pendingFile && !uploadSuccess && !uploadError && (
              <div className="rounded-md border border-dashed border-border p-6 text-center">
                <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                <div className="mt-2 text-sm">Choose a Word (.docx) or PDF file</div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FolderOpen className="h-4 w-4" /> Browse
                </Button>
              </div>
            )}

            {pendingFile && (
              <>
                <div className="rounded-md border border-border bg-card/60 p-3 flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{pendingFile.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {(pendingFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="mb-1 block">Category</Label>
                  <Select
                    value={pendingCategory}
                    onValueChange={(v) => setPendingCategory(v as TemplateCategory)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">
                        <span className="flex items-center gap-2">
                          <ClipboardList className="h-3.5 w-3.5" /> Consultation Reports
                        </span>
                      </SelectItem>
                      <SelectItem value="discharge">
                        <span className="flex items-center gap-2">
                          <Stethoscope className="h-3.5 w-3.5" /> Discharge Reports
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {uploadError && (
              <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
            {uploadSuccess && (
              <div className="rounded-md border border-success/30 bg-success/5 p-3 text-xs text-success flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Close</Button>
            <Button
              variant="primary"
              onClick={confirmUpload}
              disabled={!pendingFile || uploading}
            >
              {uploading ? "Importing..." : "Import Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function TemplateRow({
  t,
  onLock,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onRename,
  onChangeCategory,
  onSaveCustom,
}: {
  t: ReportTemplate;
  onLock: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRename: (name: string) => void;
  onChangeCategory: (c: TemplateCategory) => void;
  onSaveCustom: (patch: Partial<ReportTemplate>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(t.name);
  const [customOpen, setCustomOpen] = useState(false);

  const commit = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== t.name) onRename(trimmed);
    setEditing(false);
  };

  return (
    <tr className="hover:bg-card/40 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-card border border-border flex items-center justify-center">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          {editing && !t.locked ? (
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") { setName(t.name); setEditing(false); }
              }}
              className="h-7 text-sm w-64"
            />
          ) : (
            <button
              className={cn("text-left", !t.locked && "hover:underline")}
              onClick={() => !t.locked && setEditing(true)}
              title={t.locked ? "Locked — unlock to rename" : "Click to rename"}
            >
              <div className="text-foreground font-medium">{t.name}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {t.originalFileName ? `from ${t.originalFileName}` : "template"}
              </div>
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {t.locked ? (
          <Badge variant={t.category === "consultation" ? "primary" : "warning"}>
            {categoryLabel[t.category]}
          </Badge>
        ) : (
          <Select value={t.category} onValueChange={(v) => onChangeCategory(v as TemplateCategory)}>
            <SelectTrigger className="h-7 w-[150px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="consultation">Consultation</SelectItem>
              <SelectItem value="discharge">Discharge</SelectItem>
            </SelectContent>
          </Select>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline" className="capitalize">{t.source}</Badge>
      </td>
      <td className="px-4 py-3">
        {t.locked ? (
          <Badge variant="success" className="gap-1">
            <Lock className="h-2.5 w-2.5" /> Locked
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <Unlock className="h-2.5 w-2.5" /> Draft
          </Badge>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{formatDate(t.updatedAt)}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} title="Move up">
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} title="Move down">
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 disabled:opacity-40"
            onClick={() => setCustomOpen(true)}
            disabled={t.locked}
            title={t.locked ? "Unlock to customize" : "Customize document (header, logo, signature, footer)"}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onLock} title={t.locked ? "Unlock" : "Lock"}>
            {t.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate} title="Duplicate">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-danger hover:text-danger disabled:opacity-40"
            onClick={onDelete}
            disabled={t.locked}
            title={t.locked ? "Unlock first" : "Delete"}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CustomizeDialog
          open={customOpen}
          onOpenChange={setCustomOpen}
          template={t}
          onSave={onSaveCustom}
        />
      </td>
    </tr>
  );
}

// ==========================================================================
// Customize Dialog — formal document customization
// ==========================================================================

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function CustomizeDialog({
  open, onOpenChange, template, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: ReportTemplate;
  onSave: (patch: Partial<ReportTemplate>) => Promise<ReportTemplate>;
}) {
  const resolved = resolveChrome(template.chrome);
  const [chrome, setChrome] = useState<TemplateChrome>(template.chrome ?? {});
  const [body, setBody] = useState<string>(template.body);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reset local state when template or open state changes.
  React.useEffect(() => {
    if (open) {
      setChrome(template.chrome ?? {});
      setBody(template.body);
      setSaving(false);
      setSaveError(null);
    }
  }, [open, template.id, template.chrome, template.body]);

  const patch = <K extends keyof TemplateChrome>(k: K, v: TemplateChrome[K]) =>
    setChrome((c) => ({ ...c, [k]: v }));

  const uploadImage = async (
    file: File | undefined,
    key: "practiceLogoDataUrl" | "signatureImageDataUrl"
  ) => {
    if (!file) return;
    const url = await readFileAsDataUrl(file);
    patch(key, url);
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({ chrome, body });
      onOpenChange(false);
    } catch (e: any) {
      setSaveError(e?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // Effective (resolved) values for preview / placeholder text.
  const eff = resolveChrome(chrome);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" /> Customize · {template.name}
          </DialogTitle>
          <DialogDescription>
            Configure this document to meet formal standards — title, header, logo,
            doctor details, signature, and footer. Changes apply to all reports
            generated from this template.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Document */}
          <section className="space-y-2 md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Document title (optional override)</Label>
                <Input
                  value={chrome.titleOverride ?? ""}
                  placeholder={template.name}
                  onChange={(e) => patch("titleOverride", e.target.value)}
                />
              </div>
              <div>
                <Label>Accent colour</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={chrome.accentColor ?? PRACTICE_DEFAULTS.accentColor}
                    onChange={(e) => patch("accentColor", e.target.value)}
                    className="h-9 w-12 rounded-md border border-border bg-card cursor-pointer"
                  />
                  <Input
                    value={chrome.accentColor ?? ""}
                    placeholder={PRACTICE_DEFAULTS.accentColor}
                    onChange={(e) => patch("accentColor", e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Practice */}
          <section className="space-y-2 md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Practice / Clinic</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Practice name</Label>
                <Input
                  value={chrome.practiceName ?? ""}
                  placeholder={PRACTICE_DEFAULTS.practiceName}
                  onChange={(e) => patch("practiceName", e.target.value)}
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={chrome.practiceAddress ?? ""}
                  placeholder={PRACTICE_DEFAULTS.practiceAddress}
                  onChange={(e) => patch("practiceAddress", e.target.value)}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={chrome.practicePhone ?? ""}
                  placeholder={PRACTICE_DEFAULTS.practicePhone}
                  onChange={(e) => patch("practicePhone", e.target.value)}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={chrome.practiceEmail ?? ""}
                  placeholder={PRACTICE_DEFAULTS.practiceEmail}
                  onChange={(e) => patch("practiceEmail", e.target.value)}
                />
              </div>
              <div>
                <Label>Logo text (initials fallback)</Label>
                <Input
                  value={chrome.practiceLogoText ?? ""}
                  placeholder={PRACTICE_DEFAULTS.practiceLogoText}
                  onChange={(e) => patch("practiceLogoText", e.target.value)}
                  maxLength={4}
                />
              </div>
              <div>
                <Label>Logo image</Label>
                <div className="flex items-center gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => uploadImage(e.target.files?.[0], "practiceLogoDataUrl")}
                    />
                    <span className="inline-flex w-full items-center justify-center gap-2 h-9 rounded-md border border-border bg-card px-3 text-xs cursor-pointer hover:bg-card/70">
                      <ImagePlus className="h-3.5 w-3.5" />
                      {chrome.practiceLogoDataUrl ? "Replace" : "Upload"}
                    </span>
                  </label>
                  {chrome.practiceLogoDataUrl && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={chrome.practiceLogoDataUrl} alt="" className="h-9 w-9 rounded-md object-contain border border-border bg-white" />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => patch("practiceLogoDataUrl", undefined)} title="Remove">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Doctor */}
          <section className="space-y-2 md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Doctor / Signatory</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Doctor name</Label>
                <Input
                  value={chrome.doctorName ?? ""}
                  placeholder={PRACTICE_DEFAULTS.doctorName}
                  onChange={(e) => patch("doctorName", e.target.value)}
                />
              </div>
              <div>
                <Label>Titles / specialty</Label>
                <Input
                  value={chrome.doctorTitles ?? ""}
                  placeholder={PRACTICE_DEFAULTS.doctorTitles}
                  onChange={(e) => patch("doctorTitles", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label>License / registration</Label>
                <Input
                  value={chrome.doctorLicense ?? ""}
                  placeholder={PRACTICE_DEFAULTS.doctorLicense}
                  onChange={(e) => patch("doctorLicense", e.target.value)}
                />
              </div>
              <div>
                <Label>Signature script text</Label>
                <Input
                  value={chrome.signatureText ?? ""}
                  placeholder={PRACTICE_DEFAULTS.signatureText}
                  onChange={(e) => patch("signatureText", e.target.value)}
                />
              </div>
              <div>
                <Label>Signature image (overrides script text)</Label>
                <div className="flex items-center gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => uploadImage(e.target.files?.[0], "signatureImageDataUrl")}
                    />
                    <span className="inline-flex w-full items-center justify-center gap-2 h-9 rounded-md border border-border bg-card px-3 text-xs cursor-pointer hover:bg-card/70">
                      <ImagePlus className="h-3.5 w-3.5" />
                      {chrome.signatureImageDataUrl ? "Replace" : "Upload"}
                    </span>
                  </label>
                  {chrome.signatureImageDataUrl && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={chrome.signatureImageDataUrl} alt="" className="h-9 max-w-[80px] rounded-md object-contain border border-border bg-white" />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => patch("signatureImageDataUrl", undefined)} title="Remove">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Layout toggles + footer */}
          <section className="space-y-2 md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Layout</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ToggleRow label="Header" checked={eff.showHeader} onChange={(v) => patch("showHeader", v)} />
              <ToggleRow label="Logo" checked={eff.showLogo} onChange={(v) => patch("showLogo", v)} />
              <ToggleRow label="Signature" checked={eff.showSignature} onChange={(v) => patch("showSignature", v)} />
              <ToggleRow label="Footer" checked={eff.showFooter} onChange={(v) => patch("showFooter", v)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div>
                <Label>Footer — left</Label>
                <Input
                  value={chrome.footerLeft ?? ""}
                  placeholder={`${eff.practiceName} · Confidential medical record`}
                  onChange={(e) => patch("footerLeft", e.target.value)}
                />
              </div>
              <div>
                <Label>Footer — right</Label>
                <Input
                  value={chrome.footerRight ?? ""}
                  placeholder={`Page 1 of 1 · ${new Date().toLocaleDateString("el-GR")}`}
                  onChange={(e) => patch("footerRight", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Body */}
          <section className="space-y-2 md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Template body</div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[200px] font-mono text-xs"
            />
            <div className="text-[10px] text-muted-foreground">
              Use placeholders like <code className="font-mono">{"{{BeneficiaryName}}"}</code>,
              <code className="font-mono"> {"{{VisitDateTime}}"}</code>, etc.
            </div>
          </section>
        </div>

        <DialogFooter>
          {saveError && (
            <div className="mr-auto text-xs text-destructive">
              {saveError}
            </div>
          )}
          <Button
            variant="ghost"
            onClick={() => { setChrome({}); }}
            title="Clear all overrides — revert to defaults"
            disabled={saving}
          >
            Reset to defaults
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-md border border-border bg-card/60 px-3 py-2 cursor-pointer">
      <span className="text-xs text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
