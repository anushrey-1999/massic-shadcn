"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AssetView,
  ArchitectureExportMode,
  CtaView,
  LinkView,
  Markdown,
  PreviewLink,
  assetOf,
  boolOf,
  ctaOf,
  linkOf,
  numberOf,
  records,
  textOf,
} from "./architecture-section-fields";
import type { ArchitectureAssemblySection } from "@/types/website-architecture-content-types";

const MainHeading = createContext<string | null>(null);

function Heading({ text, className = "text-3xl" }: { text: string; className?: string }) {
  const title = useContext(MainHeading);
  if (!text) return null;
  const Tag = title === text.trim() ? "h1" : "h2";
  return <Tag className={`${className} font-medium tracking-tight`}>{text}</Tag>;
}

function Muted({ text }: { text: string }) {
  if (!text) return null
  return <p className="text-muted-foreground">{text}</p>
}

function gridClass(config: ArchitectureAssemblySection['config']): string {
  if (config?.columns === 4) return 'sm:grid-cols-4'
  if (config?.columns === 3) return 'sm:grid-cols-3'
  return 'sm:grid-cols-2'
}

function placedRight(config: ArchitectureAssemblySection['config'], key: string): boolean {
  return config?.[key] === 'right'
}

function Split({
  section,
  imageKey,
  positionKey = 'image_position',
  video = false,
}: {
  section: ArchitectureAssemblySection
  imageKey: string
  positionKey?: string
  video?: boolean
}) {
  const image = video ? (
    <AssetView video asset={assetOf(section.fields[imageKey])} />
  ) : (
    <AssetView asset={assetOf(section.fields[imageKey])} />
  )
  const copy = (
    <div className="space-y-3">
      <Heading text={textOf(section.fields, 'heading')} />
      <Muted text={textOf(section.fields, 'description')} />
      <CtaView cta={ctaOf(section.fields.cta_ref)} />
    </div>
  )
  const right = placedRight(section.config, positionKey)
  return (
    <div className="grid items-center gap-6 sm:grid-cols-2">
      {right ? copy : image}
      {right ? image : copy}
    </div>
  )
}

function TextCards({ section }: { section: ArchitectureAssemblySection }) {
  return (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <Muted text={textOf(section.fields, 'description')} />
      <div className={`grid gap-3 ${gridClass(section.config)}`}>
        {records(section.fields, 'items').map((item, index) => (
          <article key={index} className="rounded-lg border border-border p-4">
            <h3 className="font-medium">
              <LinkView link={linkOf(item.link_ref)}>{textOf(item, 'title')}</LinkView>
            </h3>
            <Markdown text={textOf(item, 'description')} className="mt-1 text-sm leading-6 text-muted-foreground" />
          </article>
        ))}
      </div>
      <CtaView cta={ctaOf(section.fields.cta_ref)} />
    </div>
  )
}

function ImageCards({ section }: { section: ArchitectureAssemblySection }) {
  return (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <Muted text={textOf(section.fields, 'description')} />
      <div className={`grid gap-3 ${gridClass(section.config)}`}>
        {records(section.fields, 'items').map((item, index) => (
          <article key={index} className="overflow-hidden rounded-lg border border-border">
            <AssetView asset={assetOf(item.image_ref)} />
            <div className="space-y-1 p-4">
              <h3 className="font-medium">
                <LinkView link={linkOf(item.link_ref)}>{textOf(item, 'title')}</LinkView>
              </h3>
              <Markdown text={textOf(item, 'description')} className="text-sm leading-6 text-muted-foreground" />
            </div>
          </article>
        ))}
      </div>
      <CtaView cta={ctaOf(section.fields.cta_ref)} />
    </div>
  )
}

// Layouts adapted from the Infer content lab (947ed1c), keyed by the Infer section registry.
const RENDERERS: Record<string, (section: ArchitectureAssemblySection) => ReactNode> = {
  'hero.centered': (section) => (
    <div className="space-y-4 text-center">
      <Heading text={textOf(section.fields, 'heading')} className="text-4xl" />
      <Muted text={textOf(section.fields, 'description')} />
      <div className="flex flex-wrap justify-center gap-3">
        <CtaView cta={ctaOf(section.fields.primary_cta)} />
        <CtaView cta={ctaOf(section.fields.secondary_cta)} />
      </div>
    </div>
  ),
  'hero.split': (section) => <Split section={section} imageKey="image_ref" />,
  'header.compact': (section) => (
    <div className="space-y-2">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <Muted text={textOf(section.fields, 'description')} />
    </div>
  ),
  'header.editorial': (section) => (
    <div className="space-y-3">
      <Heading text={textOf(section.fields, 'heading')} />
      <Muted text={textOf(section.fields, 'summary')} />
      <Muted text={[textOf(section.fields, 'author'), textOf(section.fields, 'date')].filter(Boolean).join(' · ')} />
      {section.fields.media_ref ? <AssetView asset={assetOf(section.fields.media_ref)} /> : null}
    </div>
  ),
  'text.rich': (section) => (
    <div className="space-y-3">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <Markdown text={textOf(section.fields, 'body')} />
    </div>
  ),
  'text.highlight': (section) => (
    <blockquote className="border-l-4 border-amber-700 bg-amber-50 px-5 py-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-lg" />
      <p className="text-lg text-foreground">{textOf(section.fields, 'statement')}</p>
    </blockquote>
  ),
  'split.image_text': (section) => <Split section={section} imageKey="image_ref" />,
  'grid.cards': (section) => <TextCards section={section} />,
  'grid.image_cards': (section) => <ImageCards section={section} />,
  'grid.icon_cards': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className={`grid gap-3 ${gridClass(section.config)}`}>
        {records(section.fields, 'items').map((item, index) => (
          <article key={index} className="rounded-lg bg-muted p-4">
            <p className="text-2xl">{textOf(item, 'icon')}</p>
            <h3 className="mt-2 font-medium">{textOf(item, 'title')}</h3>
            <p className="text-sm text-muted-foreground">{textOf(item, 'description')}</p>
          </article>
        ))}
      </div>
    </div>
  ),
  'list.checklist': (section) => (
    <div className="space-y-3">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <ul className="space-y-2">
        {records(section.fields, 'items').map((item, index) => (
          <li key={index} className="flex gap-2">
            <span className="text-emerald-700">✓</span>
            <span>{textOf(item, 'text')}</span>
          </li>
        ))}
      </ul>
    </div>
  ),
  'list.detailed': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="space-y-4">
        {records(section.fields, 'items').map((item, index) => (
          <div key={index}>
            <h3 className="font-medium">{textOf(item, 'title')}</h3>
            <p className="text-muted-foreground">{textOf(item, 'description')}</p>
          </div>
        ))}
      </div>
    </div>
  ),
  'process.steps': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <ol className="space-y-4">
        {records(section.fields, 'items').map((item, index) => (
          <li key={index} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground font-sans text-sm text-background">
              {index + 1}
            </span>
            <div>
              <h3 className="font-medium">{textOf(item, 'title')}</h3>
              <p className="text-muted-foreground">{textOf(item, 'description')}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  ),
  'data.comparison_table': (section) => {
    const columns = records(section.fields, 'columns')
    const rows = records(section.fields, 'rows')
    return (
      <div className="space-y-3">
        <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className="border-b border-border p-2" />
                {columns.map((column, index) => (
                  <th key={index} className="border-b border-border p-2 font-medium">
                    {textOf(column, 'label')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <th className="border-b border-border p-2 font-medium">{textOf(row, 'label')}</th>
                  {records(row, 'cells').map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-b border-border p-2">
                      {textOf(cell, 'text')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  },
  'data.pros_cons': (section) => (
    <div className="space-y-3">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-emerald-50 p-4">
          <h3 className="font-medium text-emerald-900">Pros</h3>
          <ul className="mt-2 space-y-1">
            {records(section.fields, 'pros').map((item, index) => (
              <li key={index}>{textOf(item, 'text')}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg bg-rose-50 p-4">
          <h3 className="font-medium text-rose-900">Cons</h3>
          <ul className="mt-2 space-y-1">
            {records(section.fields, 'cons').map((item, index) => (
              <li key={index}>{textOf(item, 'text')}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  ),
  'proof.kpi_strip': (section) => (
    <div className={`grid gap-3 ${records(section.fields, 'items').length > 3 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
      {records(section.fields, 'items').map((item, index) => (
        <div key={index} className="text-center">
          <p className="text-3xl font-medium">{numberOf(item, 'value')}</p>
          <p className="text-sm text-muted-foreground">{textOf(item, 'label')}</p>
        </div>
      ))}
    </div>
  ),
  'testimonial.featured': (section) => (
    <figure className="space-y-3">
      <blockquote className="text-2xl leading-snug">“{textOf(section.fields, 'quote')}”</blockquote>
      <figcaption className="text-sm text-muted-foreground">
        {textOf(section.fields, 'attribution')}
        {textOf(section.fields, 'role') ? ` · ${textOf(section.fields, 'role')}` : ''}
      </figcaption>
    </figure>
  ),
  'testimonial.cards': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        {records(section.fields, 'items').map((item, index) => (
          <figure key={index} className="rounded-lg border border-border p-4">
            <blockquote>“{textOf(item, 'quote')}”</blockquote>
            <figcaption className="mt-2 text-sm text-muted-foreground">
              {textOf(item, 'attribution')}
              {textOf(item, 'role') ? ` · ${textOf(item, 'role')}` : ''}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  ),
  'pricing.cards': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        {records(section.fields, 'items').map((item, index) => (
          <article
            key={index}
            className={`rounded-lg border p-4 ${boolOf(item, 'featured') ? 'border-foreground bg-foreground text-background' : 'border-border'}`}
          >
            <h3 className="font-medium">{textOf(item, 'name')}</h3>
            <p className="mt-1 text-2xl">{textOf(item, 'price')}</p>
            <p className={`mt-1 text-sm ${boolOf(item, 'featured') ? 'text-background/80' : 'text-muted-foreground'}`}>
              {textOf(item, 'description')}
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {records(item, 'inclusions').map((inclusion, inclusionIndex) => (
                <li key={inclusionIndex}>{textOf(inclusion, 'text')}</li>
              ))}
            </ul>
            <div className="mt-4">
              <CtaView cta={ctaOf(item.cta_ref)} />
            </div>
          </article>
        ))}
      </div>
    </div>
  ),
  'interaction.accordion': (section) => (
    <div className="space-y-3">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="divide-y divide-border border-y border-border">
        {records(section.fields, 'items').map((item, index) => (
          <details key={index} className="py-3">
            <summary className="cursor-pointer font-medium">{textOf(item, 'question')}</summary>
            <div className="pt-2">
              <Markdown text={textOf(item, 'answer')} />
            </div>
          </details>
        ))}
      </div>
    </div>
  ),
  'media.gallery': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="grid gap-3 sm:grid-cols-3">
        {records(section.fields, 'items').map((item, index) => (
          <figure key={index}>
            <AssetView layout="contain" asset={assetOf(item.image_ref)} />
            {textOf(item, 'caption') ? (
              <figcaption className="mt-1 text-xs text-muted-foreground">{textOf(item, 'caption')}</figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </div>
  ),
  'navigation.related_cards': (section) => <TextCards section={section} />,
  'location.map_details': (section) => {
    const map = linkOf(section.fields.map_ref)
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
          <p>{textOf(section.fields, 'address')}</p>
          <Muted text={textOf(section.fields, 'hours')} />
          {map?.url ? (
            <PreviewLink className="font-sans text-sm underline" url={map.url} fallback={null}>
              Open map
            </PreviewLink>
          ) : null}
        </div>
        <div className="flex min-h-40 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
          {map?.url ? 'Map' : 'Map needed'}
        </div>
      </div>
    )
  },
  'conversion.cta_band': (section) => (
    <div className="space-y-3 rounded-xl bg-foreground px-6 py-8 text-center text-background">
      <h2 className="text-3xl font-medium">{textOf(section.fields, 'heading')}</h2>
      <p className="text-background/80">{textOf(section.fields, 'description')}</p>
      <CtaView cta={ctaOf(section.fields.cta_ref)} />
    </div>
  ),
  'conversion.lead_form': (section) => (
    <div className="space-y-3 rounded-xl border border-border p-4 sm:p-6">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <Muted text={textOf(section.fields, 'description')} />
      <div className="grid gap-2">
        <input className="min-w-0 rounded-md border bg-muted px-3 py-2" aria-label="Name" placeholder="Name" disabled />
        <input className="min-w-0 rounded-md border bg-muted px-3 py-2" aria-label="Email" placeholder="Email" disabled />
        <button type="button" disabled className="rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground">
          {textOf(section.fields, 'submit_label') || 'Send'}
        </button>
      </div>
    </div>
  ),
  'hero.full_media': (section) => (
    <div className="grid overflow-hidden rounded-xl">
      <div className="min-w-0 [grid-area:1/1]"><AssetView asset={assetOf(section.fields.media_ref)} /></div>
      <div className="z-10 flex min-w-0 flex-col items-start justify-end gap-2 bg-black/60 p-6 text-white [grid-area:1/1]">
        <Heading text={textOf(section.fields, 'heading')} className="text-3xl sm:text-4xl" />
        <p>{textOf(section.fields, 'description')}</p>
        <CtaView cta={ctaOf(section.fields.cta_ref)} />
      </div>
    </div>
  ),
  'hero.minimal': (section) => (
    <div className="space-y-3">
      <Heading text={textOf(section.fields, 'heading')} className="text-4xl" />
      <Muted text={textOf(section.fields, 'description')} />
      <CtaView cta={ctaOf(section.fields.cta_ref)} />
    </div>
  ),
  'hero.media_showcase': (section) => (
    <div className="space-y-4 text-center">
      <Heading text={textOf(section.fields, 'heading')} className="text-4xl" />
      <Muted text={textOf(section.fields, 'description')} />
      <AssetView asset={assetOf(section.fields.media_ref)} />
      <CtaView cta={ctaOf(section.fields.cta_ref)} />
    </div>
  ),
  'text.two_column': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="grid gap-6 sm:grid-cols-2">
        <Markdown text={textOf(section.fields, 'left')} />
        <Markdown text={textOf(section.fields, 'right')} />
      </div>
    </div>
  ),
  'text.editorial_wide': (section) => (
    <div className="space-y-3">
      <Heading text={textOf(section.fields, 'heading')} className="text-3xl" />
      <Markdown text={textOf(section.fields, 'body')} />
    </div>
  ),
  'split.video_text': (section) => (
    <Split section={section} imageKey="video_ref" positionKey="video_position" video />
  ),
  'split.text_text': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Heading text={textOf(section.fields, 'left_heading')} className="text-xl" />
          <Markdown text={textOf(section.fields, 'left')} />
        </div>
        <div className="space-y-2">
          <Heading text={textOf(section.fields, 'right_heading')} className="text-xl" />
          <Markdown text={textOf(section.fields, 'right')} />
        </div>
      </div>
    </div>
  ),
  'split.feature_list': (section) => {
    const list = (
      <ul className="space-y-2">
        {records(section.fields, 'items').map((item, index) => (
          <li key={index} className="flex gap-2">
            <span className="text-emerald-700">✓</span>
            <span>{textOf(item, 'text')}</span>
          </li>
        ))}
      </ul>
    )
    const copy = (
      <div className="space-y-3">
        <Heading text={textOf(section.fields, 'heading')} />
        <Muted text={textOf(section.fields, 'description')} />
        <CtaView cta={ctaOf(section.fields.cta_ref)} />
      </div>
    )
    const right = placedRight(section.config, 'list_position')
    return (
      <div className="grid items-start gap-6 sm:grid-cols-2">
        {right ? copy : list}
        {right ? list : copy}
      </div>
    )
  },
  'grid.scrolling': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="flex gap-3 overflow-x-auto pb-2">
        {records(section.fields, 'items').map((item, index) => (
          <article key={index} className="w-56 shrink-0 overflow-hidden rounded-lg border border-border">
            <AssetView asset={assetOf(item.image_ref)} />
            <div className="space-y-1 p-3">
              <h3 className="font-medium">
                <LinkView link={linkOf(item.link_ref)}>{textOf(item, 'title')}</LinkView>
              </h3>
              <p className="text-sm text-muted-foreground">{textOf(item, 'description')}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  ),
  'grid.feature_rows': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="space-y-4">
        {records(section.fields, 'items').map((item, index) => (
          <article key={index} className="grid items-center gap-4 sm:grid-cols-[8rem_1fr]">
            <AssetView asset={assetOf(item.image_ref)} />
            <div>
              <h3 className="font-medium">{textOf(item, 'title')}</h3>
              <p className="text-muted-foreground">{textOf(item, 'description')}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  ),
  'grid.link_tiles': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className={`grid gap-3 ${gridClass(section.config)}`}>
        {records(section.fields, 'items').map((item, index) => (
          <article key={index} className="rounded-lg border border-border p-4 font-medium">
            <LinkView link={linkOf(item.link_ref)}>{textOf(item, 'title')}</LinkView>
          </article>
        ))}
      </div>
    </div>
  ),
  'bento.features': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="grid gap-3 sm:grid-cols-3">
        {records(section.fields, 'items').map((item, index) => (
          <article
            key={index}
            className={`rounded-lg border border-border p-4 ${boolOf(item, 'emphasis') ? 'bg-foreground text-background sm:col-span-2' : ''}`}
          >
            <h3 className="font-medium">{textOf(item, 'title')}</h3>
            <p className={`mt-1 text-sm ${boolOf(item, 'emphasis') ? 'text-background/80' : 'text-muted-foreground'}`}>
              {textOf(item, 'description')}
            </p>
          </article>
        ))}
      </div>
    </div>
  ),
  'bento.media': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="grid gap-3 sm:grid-cols-3">
        {records(section.fields, 'items').map((item, index) => (
          <figure key={index} className={index === 0 ? 'sm:col-span-2' : ''}>
            <AssetView asset={assetOf(item.image_ref)} />
            {textOf(item, 'caption') ? (
              <figcaption className="mt-1 text-xs text-muted-foreground">{textOf(item, 'caption')}</figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </div>
  ),
  'list.numbered': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <ol className="space-y-3">
        {records(section.fields, 'items').map((item, index) => (
          <li key={index} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2">
            <span className="font-medium text-muted-foreground">{index + 1}</span>
            <div>
              <h3 className="font-medium">{textOf(item, 'title')}</h3>
              <p className="text-muted-foreground">{textOf(item, 'description')}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  ),
  'list.included_excluded': (section) => (
    <div className="space-y-3">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <h3 className="font-medium text-emerald-900">Included</h3>
          <ul className="mt-2 space-y-1">
            {records(section.fields, 'included').map((item, index) => (
              <li key={index}>{textOf(item, 'text')}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-medium text-rose-900">Excluded</h3>
          <ul className="mt-2 space-y-1">
            {records(section.fields, 'excluded').map((item, index) => (
              <li key={index}>{textOf(item, 'text')}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  ),
  'people.profile_grid': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className={`grid gap-4 ${gridClass(section.config)}`}>
        {records(section.fields, 'items').map((item, index) => (
          <article key={index} className="space-y-2">
            <AssetView asset={assetOf(item.photo_ref)} />
            <h3 className="font-medium">{textOf(item, 'name')}</h3>
            <p className="text-sm text-muted-foreground">{textOf(item, 'role')}</p>
            <p className="text-sm text-muted-foreground">{textOf(item, 'biography')}</p>
          </article>
        ))}
      </div>
    </div>
  ),
  'people.featured': (section) => (
    <div className="grid items-center gap-6 sm:grid-cols-[12rem_1fr]">
      <AssetView asset={assetOf(section.fields.photo_ref)} />
      <div className="space-y-2">
        <Heading text={textOf(section.fields, 'name')} className="text-3xl" />
        <p className="text-sm text-muted-foreground">{textOf(section.fields, 'role')}</p>
        <Markdown text={textOf(section.fields, 'biography')} />
      </div>
    </div>
  ),
  'people.profile_list': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="divide-y divide-border">
        {records(section.fields, 'items').map((item, index) => (
          <article key={index} className="py-3">
            <h3 className="font-medium">{textOf(item, 'name')}</h3>
            <p className="text-sm text-muted-foreground">{textOf(item, 'role')}</p>
            <p className="text-muted-foreground">{textOf(item, 'biography')}</p>
          </article>
        ))}
      </div>
    </div>
  ),
  'process.vertical_timeline': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <ol className="space-y-4 border-l border-border pl-4">
        {records(section.fields, 'items').map((item, index) => (
          <li key={index}>
            <p className="font-sans text-xs tracking-wide text-muted-foreground uppercase">{textOf(item, 'when')}</p>
            <h3 className="font-medium">{textOf(item, 'title')}</h3>
            <p className="text-muted-foreground">{textOf(item, 'description')}</p>
          </li>
        ))}
      </ol>
    </div>
  ),
  'process.horizontal': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <ol className="grid gap-3 sm:grid-cols-4">
        {records(section.fields, 'items').map((item, index) => (
          <li key={index} className="rounded-lg bg-muted p-3">
            <p className="font-sans text-xs text-muted-foreground">{index + 1}</p>
            <h3 className="font-medium">{textOf(item, 'title')}</h3>
            <p className="text-sm text-muted-foreground">{textOf(item, 'description')}</p>
          </li>
        ))}
      </ol>
    </div>
  ),
  'process.illustrated': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <ol className="grid gap-3 sm:grid-cols-3">
        {records(section.fields, 'items').map((item, index) => (
          <li key={index} className="space-y-2">
            <AssetView asset={assetOf(item.image_ref)} />
            <h3 className="font-medium">{textOf(item, 'title')}</h3>
            <p className="text-sm text-muted-foreground">{textOf(item, 'description')}</p>
          </li>
        ))}
      </ol>
    </div>
  ),
  'data.specifications': (section) => (
    <div className="space-y-3">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <dl className="divide-y divide-border border-y border-border">
        {records(section.fields, 'rows').map((row, index) => (
          <div key={index} className="grid gap-1 py-2 sm:grid-cols-[10rem_1fr]">
            <dt className="font-medium">{textOf(row, 'label')}</dt>
            <dd className="text-muted-foreground">{textOf(row, 'value')}</dd>
          </div>
        ))}
      </dl>
    </div>
  ),
  'data.option_cards': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        {records(section.fields, 'items').map((item, index) => (
          <article key={index} className="rounded-lg border border-border p-4">
            <h3 className="font-medium">{textOf(item, 'name')}</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {records(item, 'points').map((point, pointIndex) => (
                <li key={pointIndex}>{textOf(point, 'text')}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  ),
  'data.chart': (section) => {
    const points = records(section.fields, 'points')
    const max = Math.max(...points.map((point) => Math.abs(Number(numberOf(point, 'value'))) || 0), 1)
    return (
      <div className="space-y-4">
        <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
        <div className="space-y-2">
          {points.map((point, index) => {
            const value = Number(numberOf(point, 'value')) || 0
            return (
              <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,3rem)] items-center gap-2 text-sm sm:grid-cols-[7rem_minmax(0,1fr)_3rem]">
                <span>{textOf(point, 'label')}</span>
                <span className="h-3 rounded bg-muted">
                  <span
                    className={`block h-3 rounded ${value < 0 ? 'ml-auto bg-muted-foreground' : 'bg-primary'}`}
                    style={{ width: `${(Math.abs(value) / max) * 100}%` }}
                  />
                </span>
                <span className="text-right">{numberOf(point, 'value')}</span>
              </div>
            )
          })}
        </div>
        <Muted text={textOf(section.fields, 'caption')} />
      </div>
    )
  },
  'proof.credential_grid': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        {records(section.fields, 'items').map((item, index) => (
          <article key={index} className="rounded-lg border border-border p-4">
            <h3 className="font-medium">{textOf(item, 'name')}</h3>
            <p className="text-sm text-muted-foreground">{textOf(item, 'detail')}</p>
          </article>
        ))}
      </div>
    </div>
  ),
  'proof.before_after': (section) => (
    <div className="space-y-3">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-muted p-4">
          <h3 className="font-medium">Before</h3>
          <p className="mt-1">{textOf(section.fields, 'before')}</p>
        </div>
        <div className="rounded-lg bg-muted p-4">
          <h3 className="font-medium">After</h3>
          <p className="mt-1">{textOf(section.fields, 'after')}</p>
        </div>
      </div>
      <Muted text={textOf(section.fields, 'caption')} />
    </div>
  ),
  'proof.results_highlight': (section) => (
    <div className="space-y-2 text-center">
      <Heading text={textOf(section.fields, 'heading')} className="text-lg" />
      <p className="text-4xl font-medium">{textOf(section.fields, 'result')}</p>
      <Muted text={textOf(section.fields, 'detail')} />
    </div>
  ),
  'testimonial.carousel': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="flex gap-3 overflow-x-auto pb-2">
        {records(section.fields, 'items').map((item, index) => (
          <figure key={index} className="w-72 shrink-0 rounded-lg border border-border p-4">
            <blockquote>“{textOf(item, 'quote')}”</blockquote>
            <figcaption className="mt-2 text-sm text-muted-foreground">
              {textOf(item, 'attribution')}
              {textOf(item, 'role') ? ` · ${textOf(item, 'role')}` : ''}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  ),
  'testimonial.case_study': (section) => (
    <div className="space-y-3">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <p><span className="font-medium">Problem. </span>{textOf(section.fields, 'problem')}</p>
      <p><span className="font-medium">Solution. </span>{textOf(section.fields, 'solution')}</p>
      <p><span className="font-medium">Result. </span>{textOf(section.fields, 'result')}</p>
      <p className="text-sm text-muted-foreground">{textOf(section.fields, 'attribution')}</p>
    </div>
  ),
  'media.video': (section) => (
    <div className="space-y-3">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <AssetView video asset={assetOf(section.fields.video_ref)} />
      <Muted text={textOf(section.fields, 'caption')} />
    </div>
  ),
  'media.carousel': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="flex gap-3 overflow-x-auto pb-2">
        {records(section.fields, 'items').map((item, index) => (
          <figure key={index} className="w-64 shrink-0">
            <AssetView layout="contain" asset={assetOf(item.image_ref)} />
            {textOf(item, 'caption') ? (
              <figcaption className="mt-1 text-xs text-muted-foreground">{textOf(item, 'caption')}</figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </div>
  ),
  'media.before_after': (section) => (
    <div className="space-y-3">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        <figure>
          <AssetView layout="contain" asset={assetOf(section.fields.before_ref)} />
          <figcaption className="mt-1 text-xs text-muted-foreground">Before</figcaption>
        </figure>
        <figure>
          <AssetView layout="contain" asset={assetOf(section.fields.after_ref)} />
          <figcaption className="mt-1 text-xs text-muted-foreground">After</figcaption>
        </figure>
      </div>
      <Muted text={textOf(section.fields, 'caption')} />
    </div>
  ),
  'pricing.comparison': (section) => {
    const packages = records(section.fields, 'packages')
    return (
      <div className="space-y-3">
        <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                <th className="border-b border-border p-2" />
                {packages.map((item, index) => (
                  <th key={index} className="border-b border-border p-2">
                    <span className="block font-medium">{textOf(item, 'name')}</span>
                    <span className="font-normal text-muted-foreground">{textOf(item, 'price')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records(section.fields, 'rows').map((row, index) => (
                <tr key={index}>
                  <th className="border-b border-border p-2 font-medium">{textOf(row, 'label')}</th>
                  {records(row, 'cells').map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-b border-border p-2">
                      {textOf(cell, 'text')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  },
  'pricing.simple_list': (section) => (
    <div className="space-y-3">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <ul className="divide-y divide-border border-y border-border">
        {records(section.fields, 'items').map((item, index) => (
          <li key={index} className="flex items-baseline justify-between gap-4 py-2">
            <span>
              <span className="font-medium">{textOf(item, 'name')}</span>
              {textOf(item, 'detail') ? <span className="text-muted-foreground"> · {textOf(item, 'detail')}</span> : null}
            </span>
            <span>{textOf(item, 'price')}</span>
          </li>
        ))}
      </ul>
    </div>
  ),
  'pricing.featured': (section) => (
    <article className="space-y-3 rounded-xl border border-foreground p-6">
      <Heading text={textOf(section.fields, 'name')} className="text-2xl" />
      <p className="text-3xl">{textOf(section.fields, 'price')}</p>
      <Muted text={textOf(section.fields, 'description')} />
      <ul className="space-y-1 text-sm">
        {records(section.fields, 'inclusions').map((item, index) => (
          <li key={index}>{textOf(item, 'text')}</li>
        ))}
      </ul>
      <CtaView cta={ctaOf(section.fields.cta_ref)} />
    </article>
  ),
  'interaction.tabs': (section) => <SectionTabs section={section} />,
  'interaction.expandable': (section) => (
    <details className="rounded-lg border border-border p-4">
      <summary className="cursor-pointer">
        <Heading text={textOf(section.fields, 'heading')} className="inline text-xl" />
        <p className="mt-1 text-muted-foreground">{textOf(section.fields, 'summary')}</p>
      </summary>
      <div className="pt-3">
        <Markdown text={textOf(section.fields, 'detail')} />
      </div>
    </details>
  ),
  'navigation.category_list': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        {records(section.fields, 'categories').map((category, index) => (
          <div key={index}>
            <h3 className="font-medium">{textOf(category, 'name')}</h3>
            <ul className="mt-2 space-y-1">
              {records(category, 'links').map((item, linkIndex) => (
                <li key={linkIndex}>
                  <LinkView link={linkOf(item.link_ref)}>{textOf(item, 'title')}</LinkView>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  ),
  'navigation.filterable_grid': (section) => <FilterableGrid section={section} />,
  'navigation.featured_links': (section) => <TextCards section={section} />,
  'location.cards': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        {records(section.fields, 'items').map((item, index) => {
          const map = linkOf(item.map_ref)
          return (
            <article key={index} className="rounded-lg border border-border p-4">
              <h3 className="font-medium">{textOf(item, 'name')}</h3>
              <p>{textOf(item, 'address')}</p>
              <Muted text={textOf(item, 'detail')} />
              {map?.url ? (
                <PreviewLink className="font-sans text-sm underline" url={map.url} fallback={null}>
                  Open map
                </PreviewLink>
              ) : null}
            </article>
          )
        })}
      </div>
    </div>
  ),
  'location.coverage': (section) => (
    <div className="space-y-3">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <ul className="space-y-2">
        {records(section.fields, 'items').map((item, index) => (
          <li key={index}>
            <span className="font-medium">{textOf(item, 'name')}</span>
            {textOf(item, 'detail') ? <span className="text-muted-foreground"> · {textOf(item, 'detail')}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  ),
  'location.contact_details': (section) => {
    const map = linkOf(section.fields.map_ref)
    return (
      <div className="space-y-2">
        <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
        <p>{textOf(section.fields, 'address')}</p>
        <Muted text={textOf(section.fields, 'phone')} />
        <Muted text={textOf(section.fields, 'hours')} />
        <Muted text={textOf(section.fields, 'directions')} />
        {map?.url ? (
          <PreviewLink className="font-sans text-sm underline" url={map.url} fallback={null}>
            Open map
          </PreviewLink>
        ) : null}
      </div>
    )
  },
  'conversion.split_cta': (section) => <Split section={section} imageKey="image_ref" />,
  'conversion.booking_embed': (section) => {
    const embed = linkOf(section.fields.embed_ref)
    return (
      <div className="space-y-3 rounded-xl border border-border p-6">
        <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
        <Muted text={textOf(section.fields, 'description')} />
        {embed?.url ? (
          <PreviewLink className="inline-flex rounded-full bg-foreground px-4 py-2 font-sans text-sm text-background" url={embed.url} fallback={null}>
            Open booking
          </PreviewLink>
        ) : (
          <p className="text-sm text-muted-foreground">Booking link needed</p>
        )}
      </div>
    )
  },
  'conversion.contact_options': (section) => (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        {records(section.fields, 'items').map((item, index) => (
          <article key={index} className="space-y-2 rounded-lg border border-border p-4">
            <h3 className="font-medium">{textOf(item, 'label')}</h3>
            <p className="text-muted-foreground">{textOf(item, 'detail')}</p>
            <CtaView cta={ctaOf(item.cta_ref)} />
          </article>
        ))}
      </div>
    </div>
  ),
}

function SectionTabs({ section }: { section: ArchitectureAssemblySection }) {
  const items = records(section.fields, "items");
  const exporting = useContext(ArchitectureExportMode);
  return (
    <div className="space-y-3">
      <Heading text={textOf(section.fields, "heading")} className="text-2xl" />
      {exporting ? items.map((item, index) => (
        <div key={index} className="space-y-2">
          <h3 className="font-medium">{textOf(item, "label")}</h3>
          <Markdown text={textOf(item, "body")} />
        </div>
      )) : items.length > 0 && (
        <Tabs defaultValue="0">
          <TabsList aria-label={textOf(section.fields, "heading") || "Page topics"} className="h-auto flex-wrap">
            {items.map((item, index) => (
              <TabsTrigger key={index} value={String(index)}>{textOf(item, "label")}</TabsTrigger>
            ))}
          </TabsList>
          {items.map((item, index) => (
            <TabsContent key={index} value={String(index)}>
              <Markdown text={textOf(item, "body")} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function FilterableGrid({ section }: { section: ArchitectureAssemblySection }) {
  const exporting = useContext(ArchitectureExportMode)
  const items = records(section.fields, 'items')
  const categories = [null, ...new Set(items.map((item) => textOf(item, 'category')).filter(Boolean))]
  const [selected, setSelected] = useState<string | null>(null)
  const shown = exporting || selected === null ? items : items.filter((item) => textOf(item, 'category') === selected)
  return (
    <div className="space-y-4">
      <Heading text={textOf(section.fields, 'heading')} className="text-2xl" />
      {!exporting && <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category ?? ''}
            type="button"
            aria-pressed={category === selected}
            className={`cursor-pointer rounded-full px-3 py-1 font-sans text-sm ${category === selected ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}
            onClick={() => setSelected(category)}
          >
            {category ?? 'All categories'}
          </button>
        ))}
      </div>}
      <div className="grid gap-3 sm:grid-cols-2">
        {shown.map((item, index) => (
          <article key={index} className="rounded-lg border border-border p-4">
            <h3 className="font-medium">
              <LinkView link={linkOf(item.link_ref)}>{textOf(item, 'title')}</LinkView>
            </h3>
            <p className="text-sm text-muted-foreground">{textOf(item, 'description')}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

export function hasSectionRenderer(section: ArchitectureAssemblySection) {
  return Object.hasOwn(RENDERERS, section.registry_id);
}

export function SectionBlock({
  section,
  title = null,
}: {
  section: ArchitectureAssemblySection;
  title?: string | null;
}) {
  if (!hasSectionRenderer(section)) {
    return <p className="border-b py-6 text-sm text-muted-foreground">This section is unavailable in the preview.</p>;
  }
  return (
    <section className="min-w-0 border-b py-6 last:border-b-0 sm:py-8" data-registry-id={section.registry_id}>
      <MainHeading.Provider value={title}>
        {RENDERERS[section.registry_id](section)}
      </MainHeading.Provider>
    </section>
  );
}
