#!/usr/bin/env bash
# Rebuild every talking clip's audio from the exact ElevenLabs lines, then remux into assets.
# Run from code-video/projects/dadi-reel-01. Windows = mouth-moving spans in each Seedance clip.
set -e
V=clips/v2; L=audio/final-lines
D="../../../assets/videos/dadi-approved/reel-01-white-rice/clips"
fit(){ # name tts windows gain
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $V/$1-seedance.mp4)
  echo "== $1"; python -I scripts/fit_line.py $V/$1-seedance.wav "$2" $V/$1-el.wav $d "$3"
  ffmpeg -y -v error -i $V/$1-seedance.mp4 -i $V/$1-el.wav -map 0:v -map 1:a -c:v copy \
    -af "volume=$4" -c:a aac -b:a 192k -shortest "$D/$1.mp4"
}
fit s01  $L/d01a.wav       "0.84-1.55,2.61-4.38"                    -1.5dB
fit s02  $L/r01a.wav       "0.10-0.84,1.15-2.30"                    -4dB
fit s03  $V/tts-s03.wav    "0.24-0.49,0.86-3.00,4.04-5.81,6.25-6.73,6.93-7.74" -1.5dB
fit s04  $L/r02a-single.wav "2.44-2.73"                             -4dB
fit s05  $L/d04.wav        "0.23-1.49,2.11-3.29,4.03-4.93,5.63-6.67" -1.5dB
fit s05b $L/r03.wav        "1.91-2.67"                              -4dB
fit s10  $L/r04a.wav       "0.25-1.65,3.74-4.15,4.52-4.94"          -4dB
fit s11  $L/d09.wav        "0.16-2.43,2.81-4.67,5.03-7.97"          -1.5dB
fit s12  $L/d10.wav        "0.13-1.15,1.75-3.33,3.61-4.36,4.84-5.50" -1.5dB
# s13: Rohan's line (-2.5 dB) + scream 2 at the ear grab
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $V/s13-seedance.mp4)
echo "== s13"; python -I scripts/fit_line.py $V/s13-seedance.wav $L/r05c-tight.wav $V/s13-line.wav $d "0.20-1.70,1.80-3.45"
ffmpeg -y -v error -i $V/s13-line.wav -i audio/sfx/scream-2.mp3 -filter_complex \
  "[0]volume=-4dB[a];[1]aformat=sample_rates=44100:channel_layouts=mono,volume=-3dB,adelay=4600:all=1[b];[a][b]amix=inputs=2:normalize=0,alimiter=limit=0.84:level=false,apad=whole_dur=$d[o]" \
  -map "[o]" -t $d $V/s13-el.wav
ffmpeg -y -v error -i $V/s13-seedance.mp4 -i $V/s13-el.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest "$D/s13.mp4"
echo "all clips rebuilt"
