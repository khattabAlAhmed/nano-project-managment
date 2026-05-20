"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  LayoutDashboard,
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Languages,
} from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [isRTL, setIsRTL] = useState(false);

  function toggleDir() {
    const newDir = !isRTL;
    setIsRTL(newDir);
    document.documentElement.dir = newDir ? "rtl" : "ltr";
    document.documentElement.lang = newDir ? "ar" : "en";
  }

  return (
    <main className="min-h-screen bg-background p-6 md:p-10">
      <div className="mx-auto max-w-5xl flex flex-col gap-8">
        {/* Header */}
        <div className="layout-page-header">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-text-primary">
              Design System Preview
            </h1>
            <p className="text-sm text-text-muted">
              Feature 01 — Tokens, theme, typography, RTL, components
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleDir}>
              <Languages data-icon="inline-start" />
              {isRTL ? "LTR" : "RTL"}
            </Button>
            <ThemeToggle />
          </div>
        </div>

        <Separator />

        {/* Status Colors */}
        <section className="layout-section">
          <h2 className="text-lg font-medium text-text-primary">Status Colors</h2>
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-status-pending text-status-pending-foreground">
              <Clock data-icon="inline-start" /> Pending
            </Badge>
            <Badge className="bg-status-in-progress text-status-in-progress-foreground">
              <Activity data-icon="inline-start" /> In Progress
            </Badge>
            <Badge className="bg-status-completed text-status-completed-foreground">
              <CheckCircle2 data-icon="inline-start" /> Completed
            </Badge>
            <Badge className="bg-status-delayed text-status-delayed-foreground">
              <AlertTriangle data-icon="inline-start" /> Delayed
            </Badge>
            <Badge className="bg-status-approved text-status-approved-foreground">
              <CheckCircle2 data-icon="inline-start" /> Approved
            </Badge>
            <Badge className="bg-status-rejected text-status-rejected-foreground">
              <XCircle data-icon="inline-start" /> Rejected
            </Badge>
            <Badge className="bg-status-warning text-status-warning-foreground">
              <AlertTriangle data-icon="inline-start" /> Warning
            </Badge>
            <Badge className="bg-status-info text-status-info-foreground">
              <Info data-icon="inline-start" /> Info
            </Badge>
          </div>
        </section>

        {/* Surface & Border Tokens */}
        <section className="layout-section">
          <h2 className="text-lg font-medium text-text-primary">Surface & Border Tokens</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-background border border-border p-4">
              <p className="text-sm text-text-secondary">Background</p>
            </div>
            <div className="rounded-lg bg-elevated border border-border-subtle p-4">
              <p className="text-sm text-text-secondary">Elevated + subtle border</p>
            </div>
            <div className="rounded-lg bg-surface-muted border border-border-strong p-4">
              <p className="text-sm text-text-secondary">Muted surface + strong border</p>
            </div>
          </div>
        </section>

        {/* Text Hierarchy */}
        <section className="layout-section">
          <h2 className="text-lg font-medium text-text-primary">Text Hierarchy</h2>
          <div className="flex flex-col gap-2">
            <p className="text-text-primary font-medium">Primary text — main headings and labels</p>
            <p className="text-text-secondary">Secondary text — descriptions and subheadings</p>
            <p className="text-text-muted text-sm">Muted text — timestamps, metadata</p>
            <p className="text-text-disabled text-sm">Disabled text — inactive elements</p>
          </div>
        </section>

        {/* Brand Colors */}
        <section className="layout-section">
          <h2 className="text-lg font-medium text-text-primary">Brand Colors</h2>
          <div className="flex gap-3">
            <Button className="bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90">
              Primary Brand
            </Button>
            <Button className="bg-brand-secondary text-brand-secondary-foreground hover:bg-brand-secondary/90">
              Secondary Brand
            </Button>
          </div>
        </section>

        {/* Dashboard Cards */}
        <section className="layout-section">
          <h2 className="text-lg font-medium text-text-primary">Dashboard Cards</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardDescription>Total Sessions</CardDescription>
                <CardTitle className="text-2xl">1,248</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-muted">+12% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Active Projects</CardDescription>
                <CardTitle className="text-2xl">7</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-muted">3 in execution phase</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Pending Approvals</CardDescription>
                <CardTitle className="text-2xl">23</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-muted">5 overdue</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Button Variants */}
        <section className="layout-section">
          <h2 className="text-lg font-medium text-text-primary">Button Variants</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
        </section>

        {/* Form Example */}
        <section className="layout-section">
          <h2 className="text-lg font-medium text-text-primary">Form Elements</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="layout-form max-w-md">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input id="project-name" placeholder="Enter project name..." />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" placeholder="Project description..." />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="active" />
                  <Label htmlFor="active">Mark as active project</Label>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button>Save Project</Button>
                  <Button variant="outline">Cancel</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Skeleton Loading */}
        <section className="layout-section">
          <h2 className="text-lg font-medium text-text-primary">Loading States</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Typography — Bilingual */}
        <section className="layout-section">
          <h2 className="text-lg font-medium text-text-primary">Bilingual Typography</h2>
          <Card>
            <CardContent className="pt-6 flex flex-col gap-4">
              <div>
                <p className="text-sm text-text-muted">English (Inter)</p>
                <p className="text-lg text-text-primary">
                  Field Project Management System — managing operations across centers
                </p>
              </div>
              <Separator />
              <div dir="rtl">
                <p className="text-sm text-text-muted">العربية (Cairo)</p>
                <p className="text-lg text-text-primary">
                  نظام إدارة المشاريع الميدانية — إدارة العمليات عبر المراكز
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-sm text-text-muted">
            Design System v1.0 — Feature 01 Complete
          </p>
        </div>
      </div>
    </main>
  );
}
