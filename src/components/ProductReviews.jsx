"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Clock, XCircle, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import StarRating from "./StarRating";

export default function ProductReviews({ productId, averageRating = 0, reviewCount = 0 }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [distribution, setDistribution] = useState({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [myReview, setMyReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(reviewCount);

  // Form state
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${productId}/reviews?page=${page}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load reviews");

      setReviews(data.reviews || []);
      setDistribution(data.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
      setMyReview(data.myReview || null);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Load reviews error:", error);
    } finally {
      setLoading(false);
    }
  }, [productId, page]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!rating) {
      toast.error("Please pick a star rating");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating, title, comment }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit review");

      toast.success(data.message || "Review submitted for approval");
      setRating(0);
      setTitle("");
      setComment("");
      await loadReviews();
    } catch (error) {
      toast.error(error.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const maxInDistribution = Math.max(...Object.values(distribution), 1);

  return (
    <div className="border-t border-emerald-50 pt-8 mt-8">
      <h2 className="text-lg font-black text-emerald-950 mb-6 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-emerald-600" />
        Customer Reviews
      </h2>

      {/* SUMMARY */}
      <div className="flex flex-col sm:flex-row gap-8 mb-8">
        <div className="text-center sm:text-left shrink-0">
          <div className="text-4xl font-black text-emerald-950 leading-none">
            {averageRating ? averageRating.toFixed(1) : "—"}
          </div>
          <StarRating value={averageRating} size="sm" className="mt-2" />
          <div className="text-xs font-medium text-emerald-600/70 mt-1.5">
            {total} review{total === 1 ? "" : "s"}
          </div>
        </div>

        {/* DISTRIBUTION */}
        <div className="flex-1 space-y-1.5 min-w-0">
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-3 font-bold text-emerald-900/70">{star}</span>
              <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${(distribution[star] / maxInDistribution) * 100}%` }}
                />
              </div>
              <span className="w-6 text-right font-medium text-emerald-600/70">
                {distribution[star]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* WRITE A REVIEW */}
      {!isAuthenticated() ? (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 mb-8 text-center">
          <p className="text-sm font-medium text-stone-600 mb-3">
            Sign in to leave a review
          </p>
          <button
            onClick={() => router.push("/login")}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition-all"
          >
            Sign In
          </button>
        </div>
      ) : myReview ? (
        // The user already has a review — show its moderation state instead of
        // a form they cannot submit.
        <div
          className={`rounded-2xl p-5 mb-8 border ${
            myReview.status === "pending"
              ? "bg-amber-50 border-amber-200"
              : myReview.status === "rejected"
              ? "bg-red-50 border-red-200"
              : "bg-emerald-50 border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {myReview.status === "pending" && <Clock className="w-4 h-4 text-amber-600" />}
            {myReview.status === "rejected" && <XCircle className="w-4 h-4 text-red-600" />}
            <p
              className={`text-xs font-bold uppercase tracking-wider ${
                myReview.status === "pending"
                  ? "text-amber-700"
                  : myReview.status === "rejected"
                  ? "text-red-700"
                  : "text-emerald-700"
              }`}
            >
              {myReview.status === "pending"
                ? "Your review is awaiting approval"
                : myReview.status === "rejected"
                ? "Your review was not published"
                : "Your review is live"}
            </p>
          </div>
          <StarRating value={myReview.rating} size="sm" />
          {myReview.title && (
            <p className="text-sm font-bold text-stone-800 mt-2">{myReview.title}</p>
          )}
          {myReview.comment && (
            <p className="text-sm text-stone-600 mt-1 leading-relaxed">{myReview.comment}</p>
          )}
          {myReview.status === "rejected" && myReview.rejectionReason && (
            <p className="text-xs text-red-700 mt-2">
              <span className="font-bold">Reason:</span> {myReview.rejectionReason}
            </p>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-stone-50 border border-stone-200 rounded-2xl p-5 mb-8 space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2 uppercase tracking-wider">
              Your Rating <span className="text-red-500">*</span>
            </label>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2 uppercase tracking-wider">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Sum it up in a line"
              className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2 uppercase tracking-wider">
              Your Review
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="What did you think of this product?"
              className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-[11px] text-stone-500">
              Reviews are published once an admin approves them.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      )}

      {/* REVIEW LIST */}
      {loading ? (
        <div className="py-10 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-medium text-stone-500">
            No reviews yet. Be the first to review this product.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {reviews.map((review) => (
            <div key={review._id} className="border-b border-stone-100 pb-5 last:border-0">
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-black text-emerald-700 overflow-hidden shrink-0">
                  {review.user?.dp ? (
                    <img src={review.user.dp} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (review.user?.name || "?").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-emerald-950 truncate">
                    {review.user?.name || review.user?.username || "Anonymous"}
                  </p>
                  <div className="flex items-center gap-2">
                    <StarRating value={review.rating} size="sm" />
                    <span className="text-[11px] text-stone-400">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              {review.title && (
                <p className="text-sm font-bold text-stone-800 mt-2">{review.title}</p>
              )}
              {review.comment && (
                <p className="text-sm text-stone-600 mt-1 leading-relaxed">{review.comment}</p>
              )}
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold disabled:opacity-40 hover:bg-stone-200 transition-all"
              >
                Previous
              </button>
              <span className="text-xs font-medium text-stone-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold disabled:opacity-40 hover:bg-stone-200 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
