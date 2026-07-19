import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MarketingShell from "@/components/MarketingShell";
import { allPostSlugs, getPost } from "@/lib/seo-blog";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return allPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Blog" };
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <MarketingShell testid={`blog-${post.slug}`}>
      <article className="max-w-3xl mx-auto">
        <Link href="/blog" className="text-sm text-primary hover:underline">
          ← Blog
        </Link>
        <time className="block mt-4 text-xs text-muted-foreground" dateTime={post.date}>
          {post.date}
        </time>
        <h1 className="font-display font-black text-3xl sm:text-4xl mt-2 tracking-tight">{post.title}</h1>
        <p className="mt-3 text-muted-foreground">{post.description}</p>
        <div className="mt-8 space-y-4 text-foreground/90 leading-relaxed">
          {post.paragraphs.map((para) => (
            <p key={para.slice(0, 40)}>{para}</p>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/signup" className="pill-btn btn-primary h-12 px-6">
            Try MealHQ
          </Link>
          <Link href="/for-tiffin-providers" className="pill-btn btn-outline h-12 px-6">
            For providers
          </Link>
        </div>
      </article>
    </MarketingShell>
  );
}
