import type { Metadata } from 'next';
import { Toolbar } from '@/components/toolbar';
import { Extractor } from '@/components/extractor';
import { namePoints } from '@/lib/palette-names';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Image colours · Super Colour',
  description:
    'Extract the main colours of an image in your browser, with their proportions, and open them in the Laboratory. Nothing is uploaded; pixels are never renamed as historical colours.',
};

export default function Extract() {
  return (
    <>
      <Toolbar middle="Image colours" />
      <main
        id="main"
        className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-5 py-8 sm:px-12"
      >
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-[17px] font-semibold">Image colours</h1>
          <p className="m-0 max-w-[75ch] text-sm text-[var(--muted)]">
            The main colours of an image as observations: a value and the share of the image it
            covers. The image is decoded and measured in your browser and never leaves it. Nearby
            documented records are offered separately, as a search; a pixel is never renamed as a
            historical colour.
          </p>
        </div>
        <Extractor points={namePoints()} />
      </main>
    </>
  );
}
