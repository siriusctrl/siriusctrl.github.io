#!/usr/bin/env bash
set -euo pipefail

repo_root="${TOWERLAB_ROOT:-/root/towerlab}"
output_dir="${1:-$repo_root/target/portfolio-capture}"
screen_w=1440
screen_h=960
window_w=1180
window_h=820
class_name="towerlab-portfolio-$$"
display=""
xvfb_pid=""
kitty_pid=""
ffmpeg_pid=""

for tool in Xvfb kitty xdotool ffmpeg xwininfo xdpyinfo; do
  command -v "$tool" >/dev/null 2>&1 || { echo "capture requires $tool" >&2; exit 1; }
done

cleanup() {
  if [[ -n "${ffmpeg_pid:-}" ]]; then kill -INT "$ffmpeg_pid" 2>/dev/null || true; wait "$ffmpeg_pid" 2>/dev/null || true; fi
  if [[ -n "${kitty_pid:-}" ]]; then kill "$kitty_pid" 2>/dev/null || true; wait "$kitty_pid" 2>/dev/null || true; fi
  if [[ -n "${xvfb_pid:-}" ]]; then kill "$xvfb_pid" 2>/dev/null || true; wait "$xvfb_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT

for candidate in $(seq 90 119); do
  if [[ ! -e "/tmp/.X11-unix/X${candidate}" && ! -e "/tmp/.X${candidate}-lock" ]]; then
    display=":${candidate}"
    break
  fi
done
[[ -n "$display" ]] || { echo "no free X display" >&2; exit 1; }

mkdir -p "$output_dir/kitty-config"
corepack pnpm --dir "$repo_root" build >/dev/null

Xvfb "$display" -screen 0 "${screen_w}x${screen_h}x24" +extension GLX +render -nolisten tcp \
  >"$output_dir/xvfb.log" 2>&1 &
xvfb_pid=$!
for _ in $(seq 1 50); do
  DISPLAY="$display" xdpyinfo >/dev/null 2>&1 && break
  sleep 0.1
done

export DISPLAY="$display"
export LIBGL_ALWAYS_SOFTWARE=1
export KITTY_CONFIG_DIRECTORY="$output_dir/kitty-config"
cat >"$KITTY_CONFIG_DIRECTORY/kitty.conf" <<EOF
font_family DejaVu Sans Mono
font_size 14
remember_window_size no
initial_window_width ${window_w}
initial_window_height ${window_h}
background #0b1117
foreground #d7dde2
cursor #d7dde2
enable_audio_bell no
confirm_os_window_close 0
EOF

kitty --class "$class_name" --title "$class_name" sh -lc "cd '$repo_root' && exec bash --noprofile --norc" \
  >"$output_dir/kitty.stdout" 2>"$output_dir/kitty.stderr" &
kitty_pid=$!

window_id=""
for _ in $(seq 1 100); do
  window_id="$(xdotool search --onlyvisible --class "$class_name" 2>/dev/null | head -n 1 || true)"
  [[ -n "$window_id" ]] && break
  sleep 0.1
done
[[ -n "$window_id" ]] || { echo "Kitty window not found" >&2; exit 1; }

xwininfo -id "$window_id" >"$output_dir/window.txt"
xdotool windowfocus "$window_id" 2>/dev/null || true
xdotool mousemove "$((screen_w - 8))" "$((screen_h - 8))" 2>/dev/null || true
xdotool type --clearmodifiers --delay 0 -- "node packages/cli/dist/cli/src/main.js --seed 7 --character warrior"
xdotool key --clearmodifiers Return
sleep 1.4

video="$output_dir/session.mp4"
ffmpeg -hide_banner -loglevel warning -y \
  -f x11grab -framerate 24 -video_size "${screen_w}x${screen_h}" -i "$display" \
  -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p "$video" \
  >"$output_dir/ffmpeg.stdout" 2>"$output_dir/ffmpeg.stderr" &
ffmpeg_pid=$!

sleep 1.0
xdotool key --window "$window_id" 1
sleep 1.3
xdotool key --window "$window_id" 1
sleep 1.5
xdotool key --window "$window_id" 1
sleep 1.2
xdotool key --window "$window_id" space
sleep 1.2
xdotool key --window "$window_id" Escape
sleep 0.5

kill -INT "$ffmpeg_pid" 2>/dev/null || true
wait "$ffmpeg_pid" 2>/dev/null || true
ffmpeg_pid=""

ffmpeg -hide_banner -loglevel error -y -ss 4.4 -i "$video" -frames:v 1 \
  -vf "crop=${window_w}:${window_h}:0:0,scale=1600:-1:flags=lanczos" "$output_dir/portfolio.png"

printf 'video=%s\nimage=%s\n' "$video" "$output_dir/portfolio.png"
