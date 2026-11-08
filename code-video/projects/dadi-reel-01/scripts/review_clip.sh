#!/usr/bin/env bash
# usage: review_clip.sh <name> <url>   (run from code-video/projects/dadi-reel-01)
# downloads raw clip, extracts audio, makes a 0.5 s frame grid and prints a 0.1 s loudness map
set -e
n="$1"; u="$2"
curl -s -o "clips/v2/$n-seedance.mp4" "$u"
ffprobe -v error -show_entries format=duration -of csv=p=0 "clips/v2/$n-seedance.mp4"
ffmpeg -y -v error -i "clips/v2/$n-seedance.mp4" -vn -ac 1 -ar 44100 "clips/v2/$n-seedance.wav"
ffmpeg -y -v error -i "clips/v2/$n-seedance.mp4" -vf "fps=2,scale=240:-1,tile=8x2" -frames:v 1 "review/$n-grid.png"
python -I - "clips/v2/$n-seedance.wav" <<'EOF'
import sys,wave,struct
w=wave.open(sys.argv[1]);sr=w.getframerate();d=w.readframes(w.getnframes())
s=struct.unpack("<%dh"%(len(d)//2),d);st=sr//10
print(" ".join("%d"%(max(abs(x) for x in s[i:i+st])//1000) for i in range(0,len(s),st)))
EOF
