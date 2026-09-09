"use client";

import { useState } from "react";

export default function SubmitMushroom() {
  const [image, setImage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const body = new FormData(e.target);
    body.append("image", image);

    await fetch("/api/mushrooms/create", {
      method: "POST",
      body,
    });

    alert("Submitted for review");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Mushroom name" />
      <input name="category" placeholder="Category" />
      <input name="latitude" />
      <input name="longitude" />
      <input type="file" onChange={(e) => setImage(e.target.files[0])} />
      <button>Submit</button>
    </form>
  );
}
