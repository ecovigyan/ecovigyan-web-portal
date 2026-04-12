"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, User, FileText } from "lucide-react";
import ArticleImage from "@/components/ArticleImage";

export default function ArticlePage() {
  const params = useParams();
  const id = params?.id;
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setError("Article ID not found");
      setLoading(false);
      return;
    }

    const fetchArticle = async () => {
      try {
        const res = await fetch(`/api/articles/${id}`);
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 404) {
            setError("Article not found");
          } else {
            setError(data.error || "Failed to load article");
          }
          setLoading(false);
          return;
        }

        setArticle(data.article);
      } catch (err) {
        console.error("Error fetching article:", err);
        setError("Failed to load article");
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FileText className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
            <p className="text-gray-600">Loading article...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md px-6">
            <FileText className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              {error || "Article not found"}
            </h1>
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Articles
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const images = article.images || [];

  return (
    <div className="min-h-screen bg-white">
      {/* Article Content */}
      <article className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold mb-8 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Articles
          </Link>

          {/* Article Meta */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex flex-wrap items-center gap-4 mb-6 text-emerald-600">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <span className="font-semibold">{article.uploadedBy?.name || "Author"}</span>
                {article.uploadedBy?.username && (
                  <>
                    <span className="text-emerald-400">•</span>
                    <span className="text-sm text-gray-600">@{article.uploadedBy.username}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>
                  {new Date(article.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 font-serif leading-tight">
              {article.title}
            </h1>
          </motion.div>

          {/* Article Images */}
          {images.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={`mb-12 ${images.length === 1 ? "" : "grid md:grid-cols-2 gap-6"}`}
            >
              {images.map((image, index) => (
                <div key={index} className="rounded-2xl overflow-hidden border-4 border-emerald-100 shadow-lg">
                  <ArticleImage
                    src={image.url}
                    alt={`${article.title} - Image ${index + 1}`}
                  />
                </div>
              ))}
            </motion.div>
          )}

          {/* Article Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="article-rich-content max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Article Footer - Author Bio */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-12 pt-8 border-t-2 border-emerald-100"
          >
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-8">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
                  {article.uploadedBy?.name ? article.uploadedBy.name.charAt(0).toUpperCase() : "A"}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {article.uploadedBy?.name || "Anonymous Author"}
                  </h3>
                  <p className="text-emerald-700 font-semibold mb-2">
                    {article.uploadedBy?.username ? `@${article.uploadedBy.username}` : "Contributor"}
                  </p>
                  <p className="text-gray-600 text-sm">
                    Contributing to environmental research and conservation education through the Eco Vigyan Foundation.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="mt-12 flex justify-center">
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
            >
              <FileText className="w-5 h-5" />
              View All Articles
            </Link>
          </div>
        </div>
      </article>
    </div>
  );
}
