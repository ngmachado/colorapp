"""Cross-check fixture generator. Run with a Python that has colour-science installed:
    python3 scripts/oracle.py > src/fixtures/oracle.json
The engine's tests compare Color.js output against these numbers.
Whitepoints use the CSS Color 4 chromaticities (D65 0.3127/0.3290, D50 0.3457/0.3585)
and the sRGB matrix derived from its primaries, matching the engine's conventions."""
import json
import sys

import numpy as np
import colour
from colour.adaptation import chromatic_adaptation

D65 = np.array([0.3127, 0.3290])
D50 = np.array([0.3457, 0.3585])
XYZ_D65 = colour.xy_to_XYZ(D65)
XYZ_D50 = colour.xy_to_XYZ(D50)

cs = colour.RGB_COLOURSPACES["sRGB"].copy()
cs.use_derived_transformation_matrices(True)

SAMPLES = [
    [1, 1, 1], [0, 0, 0], [0.5, 0.5, 0.5], [1, 0, 0], [0, 1, 0], [0, 0, 1],
    [1, 1, 0], [0, 1, 1], [1, 0, 1], [0.2, 0.4, 0.6], [0.9, 0.1, 0.3],
    [0.123, 0.456, 0.789], [0.05, 0.05, 0.05], [0.75, 0.6, 0.2], [0.33, 0.8, 0.45],
]


def sample(rgb):
    rgb = np.array(rgb, dtype=float)
    xyz65 = colour.RGB_to_XYZ(rgb, cs, illuminant=D65, apply_cctf_decoding=True)
    xyz50 = chromatic_adaptation(xyz65, XYZ_D65, XYZ_D50, method="Von Kries", transform="Bradford")
    lab50 = colour.XYZ_to_Lab(xyz50, illuminant=D50)
    oklab = colour.XYZ_to_Oklab(xyz65)
    return {
        "srgb": rgb.tolist(),
        "xyz_d65": xyz65.tolist(),
        "xyz_d50": xyz50.tolist(),
        "lab_d50": lab50.tolist(),
        "oklab": oklab.tolist(),
    }


json.dump(
    {
        "generator": f"colour-science {colour.__version__}",
        "whitepoints": {"D65": D65.tolist(), "D50": D50.tolist()},
        "samples": [sample(s) for s in SAMPLES],
    },
    sys.stdout,
    indent=1,
)
