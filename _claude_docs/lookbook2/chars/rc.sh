#!/bin/bash
# rc.sh <variant> <scale> <who> <name> [post options...] — render one character and pack its sheet to test/<name>-<variant>-<scale>.png
V=$1; S=$2; WHO=$3; N=$4; shift 4
D=frames/$V-$S/$N
rm -rf "$D"
if [[ $WHO == pilot* ]]; then
  CHIBI=$V CHIBI_SCALE=$S CHIBI_PILOT=1 /home/user/BVENV/bin/python chibi_chars.py frames/$V-$S/pilot-raw pilot-a short >/dev/null 2>&1
  rm -rf "$D"; mv frames/$V-$S/pilot-raw/short "$D"; rm -rf frames/$V-$S/pilot-raw
else
  CHIBI=$V CHIBI_SCALE=$S CHIBI_STAND=1 /home/user/BVENV/bin/python chibi_chars.py "$D" "$WHO" >/dev/null 2>&1
fi
python3 chibi_post.py "$D" "${OUTP:-test}/$N-$V-$S.png" "$@"
