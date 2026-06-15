// Helpers to build social share URLs. All inputs are URL-encoded.

export function buildFacebookShare(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function buildXShare(url: string, text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text,
  )}&url=${encodeURIComponent(url)}`;
}

export function buildLinkedInShare(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

// Instagram has no public web share endpoint; we surface a caption to copy.
export function buildInstagramCaption(url: string, text: string): string {
  return `${text}\n${url}`;
}
