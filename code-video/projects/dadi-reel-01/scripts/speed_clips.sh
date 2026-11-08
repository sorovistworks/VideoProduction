#!/usr/bin/env bash
# Speed every reel clip by $1 (default 1.1): minterpolate for picture (no dropped/repeated frames),
# rubberband for voices (pitch kept). Always reads the 1x originals in clips-1x/, writes edit/assets/clips/.
set -e
cd "$(dirname "$0")/.."
F=${1:-1.1}
mkdir -p clips-1x
for c in edit/assets/clips/*.mp4; do [ -f "clips-1x/$(basename "$c")" ] || cp "$c" clips-1x/; done
ls clips-1x/*.mp4 | xargs -P 4 -I{} sh -c 'n=$(basename {}); ffmpeg -y -v error -i {} -filter_complex \
 "[0:v]setpts=PTS/'"$F"',minterpolate=fps=48:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,fps=24,format=yuv420p[v];[0:a]rubberband=tempo='"$F"':pitchq=quality:transients=crisp[a]" \
 -map "[v]" -map "[a]" -r 24 -c:v libx264 -crf 14 -preset slow -c:a aac -b:a 192k edit/assets/clips/$n && echo "done $n"'
