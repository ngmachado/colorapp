import { Toolbar } from '@/components/toolbar';
import { ColourInput } from '@/components/colour-input';
export const metadata = {
  title: 'Colour inspector',
  description:
    'Inspect an sRGB colour, copy conversions, check contrast and find nearby documented records.',
};
export default function ColourHome() {
  return (
    <>
      <Toolbar />
      <main id="main" className="mx-auto flex max-w-[1100px] flex-col gap-6 px-5 py-12 sm:px-12">
        <h1 className="text-4xl font-semibold">Colour inspector</h1>
        <p>
          Conversions, variations, contrast and nearby documented records for any opaque sRGB hex
          colour.
        </p>
        <ColourInput />
      </main>
    </>
  );
}
