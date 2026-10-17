"""The pilot's attack poses, the dodge roll, and how a weapon is held — shared by characters.py (the pilot's
attack sheets: pilot-attack[-<style>]-<a|b>) and weapon_sprites.py (each weapon drawn in the hand, frame by frame).

No bpy here: a pose is plain numbers, applied to characters.py's skeleton by apply(). Run it to write the sheet
layout the game reads:

  python3 tools/bridge-art/attacks.py          # → apps/bridge/assets/characters/attacks.json

THE SHEET (pilot-attack-…png): frames FRAME px (wider and taller than the walk's 32 × 48, for lunges and swings),
the floor point under the pilot at ORIGIN; rows down / right / up / left; columns COLS in order — each weapon class's
key poses, then the roll. The game (js/arms.js) plays a class's swings as sequences of these columns with its own
timing; a charged swing holds the class's wind-up pose.

Angles are degrees, the skeleton is characters.py's (model units, the pilot faces -y):
  chest  (lean, side, twist) — a pivot at the waist carrying the torso, arms and head (the legs stay planted).
         lean > 0 bends forward; twist < 0 turns the shoulders toward the weapon hand (the pilot's right).
  armW / armO — the weapon arm (the pilot's right hand, characters.py shoulders['L'], model -x) and the other one:
         (raise, out, sweep): raise < 0 lifts the arm forward (-90 level, -180 straight up), > 0 swings it back;
         out > 0 lifts the weapon arm out to the side (armO: < 0); sweep (once raised) > 0 carries it toward the
         pilot's left (+x), < 0 toward the right.
  hipW / hipO, kneeW / kneeO — leg swing (< 0 forward) and knee bend; the body drops so the lower foot stays down.
  aim (azimuth, elevation, roll) — where the weapon points, in the pilot's own frame: azimuth 0 ahead, +90 to the
         pilot's right, -90 to the left, 180 behind; elevation +90 straight up. The wrist turns to suit.
  off — two-handed: the other hand reaches for the haft this far along it from the main hand (model units).
  fwd — the body moved along its facing (< 0 forward: a lunge; model units), lift — up, yaw — turned on the spot (a spin), tumble — rolled
  head over heels (the dodge roll), hide — no weapon drawn in this frame.
"""
import json
import os

FRAME = (80, 92)
ORIGIN = (40, 60)
WEAPON_FRAME = (176, 176)       # weapons are rendered big (a pike thrust reaches two tiles) and cropped when packed
WEAPON_ORIGIN = (88, 104)

REST = dict(chest=(0, 0, 0), armW=(8, 4, 0), armO=(8, -4, 0), hipW=(0, 0), hipO=(0, 0), kneeW=0, kneeO=0,
            aim=(0, -50, 0), off=None, fwd=0.0, lift=0.0, yaw=0.0, tumble=0.0, head=(0, 0, 0), hide=False,
            draw=False, arrow=False)


def P(**kw):
    out = dict(REST)
    out.update(kw)
    return out


def crouch(h, k):
    return dict(hipW=(-h, 0), hipO=(-h, 0), kneeW=k, kneeO=k)


def lunge(front, bend, back, fwd=0.0):
    # the off-side foot forward, knee bent; the weapon-side leg back and straight
    return dict(hipO=(-front, 0), kneeO=bend, hipW=(back, 0), kneeW=6, fwd=fwd)


# ---- the classes ------------------------------------------------------------------------------------------------
# Each class: its key poses in sheet order. js/arms.js strings them into swings (and chains) with timing.
CLASSES = [
    # quick blade (Iron Dagger, Veilpiercer): a jab, a backhand cut, a lunging stab to finish a chain
    ('blade', [
        ('ready', P(chest=(6, 0, -26), armW=(30, 14, 0), aim=(0, -4, 0), **crouch(10, 18))),
        ('jab', P(chest=(10, 0, 16), armW=(-84, 0, 14), aim=(0, -2, 0), **lunge(22, 26, 14, -1.2))),
        ('cross', P(chest=(6, 0, 30), armW=(-66, 0, 62), aim=(-62, 6, 90), **crouch(8, 14))),
        ('cut', P(chest=(8, 0, -30), armW=(-76, 0, -72), aim=(86, -4, 90), **lunge(12, 16, 8, -0.6))),
        ('coil', P(chest=(18, 0, -34), armW=(38, 12, 0), aim=(0, -6, 0), **crouch(32, 56))),
        ('lunge', P(chest=(20, 0, 10), armW=(-88, 0, 8), aim=(0, -6, 0), **lunge(40, 48, 28, -3.4))),
    ]),
    # sword (Cutlass, Star Blade, Moonglass Sabre): wide sweeps; the third of a chain a full spin
    ('sword', [
        ('wind', P(chest=(4, 0, -40), armW=(-62, 24, -66), aim=(124, 22, 90), **crouch(8, 14))),
        ('sweep', P(chest=(8, 0, 0), armW=(-86, 0, -4), aim=(0, 4, 90), **lunge(14, 18, 8, -0.8))),
        ('left', P(chest=(8, 0, 38), armW=(-80, 0, 72), aim=(-104, -2, 90), **lunge(10, 14, 6, -0.6))),
        ('right', P(chest=(8, 0, -36), armW=(-80, 0, -76), aim=(106, -2, 90), **lunge(10, 14, 6, -0.6))),
        ('spin1', P(yaw=95, chest=(10, 0, 20), armW=(-84, 0, 40), aim=(-60, 0, 90), **crouch(14, 24))),
        ('spin2', P(yaw=185, chest=(10, 0, 20), armW=(-84, 0, 40), aim=(-60, 0, 90), **crouch(14, 24))),
        ('spin3', P(yaw=275, chest=(10, 0, 20), armW=(-84, 0, 40), aim=(-60, 0, 90), **crouch(14, 24))),
    ]),
    # chopping (Rime Hatchet, Emberbrand): up over the shoulder, a diagonal chop with weight behind it
    ('chop', [
        ('raise', P(chest=(-10, 0, -26), armW=(-150, 42, 0), aim=(128, 50, 0), hipW=(10, 0), hipO=(-10, 0), kneeO=8)),
        ('fall', P(chest=(6, 0, -6), armW=(-108, 10, 8), aim=(8, 42, 0), **lunge(14, 18, 10, -0.6))),
        ('through', P(chest=(22, 0, 24), armW=(-36, 0, 42), aim=(-24, -52, 0), **lunge(22, 34, 14, -1.4))),
        ('raise2', P(chest=(-8, 0, 28), armW=(-146, -16, 50), aim=(-128, 50, 0), hipW=(-8, 0), hipO=(10, 0), kneeW=8)),
        ('through2', P(chest=(20, 0, -20), armW=(-44, 12, -36), aim=(30, -52, 0), **lunge(22, 34, 14, -1.4))),
    ]),
    # polearm (Boarding Pike): drawn back two-handed, a long lunging thrust
    ('pole', [
        ('draw', P(chest=(2, 0, -50), armW=(52, 14, 0), aim=(0, 4, 0), off=9, **crouch(16, 26))),
        ('thrust', P(chest=(12, 0, -4), armW=(-62, 0, 14), aim=(0, -2, 0), off=10, **lunge(32, 38, 22, -2.4))),
        ('reach', P(chest=(16, 0, 0), armW=(-80, 0, 10), aim=(0, -4, 0), off=11, **lunge(38, 46, 26, -3.4))),
        ('back', P(chest=(6, 0, -24), armW=(6, 6, 0), aim=(0, 0, 0), off=10, **crouch(10, 18))),
        ('long', P(chest=(24, 0, 4), armW=(-88, 0, 8), aim=(0, -6, 0), off=12, **lunge(48, 60, 34, -5.0))),
    ]),
    # maul (War Maul): swung back, heaved up overhead, brought down on the ground
    ('maul', [
        ('heft', P(chest=(14, 0, -30), armW=(44, 0, 0), aim=(166, -34, 0), off=6, **crouch(18, 30))),
        ('over', P(chest=(-14, 0, -10), armW=(-164, 24, 0), aim=(150, 40, 0), off=6, lift=0.6)),
        ('slam', P(chest=(26, 0, 0), armW=(-64, 0, 0), aim=(0, -58, 0), off=6, **crouch(24, 42))),
        ('quake', P(chest=(32, 0, 0), armW=(-48, 0, 0), aim=(0, -74, 0), off=6, **crouch(40, 68))),
        ('rise', P(chest=(10, 0, 0), armW=(-16, 0, 0), aim=(0, -64, 0), off=6, **crouch(8, 14))),
    ]),
    # staff and wand (Wispcaller, Moonlit Wand): raised, then thrust out — the burst leaves the tip
    ('cast', [
        ('raise', P(chest=(-8, 0, -12), armW=(-150, 10, 0), aim=(0, 84, 0), armO=(-34, -24, 0))),
        ('burst', P(chest=(12, 0, 4), armW=(-96, 0, 4), aim=(0, 8, 0), armO=(26, -16, 0), **lunge(14, 18, 10, -1.0))),
        ('after', P(chest=(6, 0, 0), armW=(-80, 0, 0), aim=(0, 18, 0), armO=(14, -10, 0))),
    ]),
    # pickaxe (and the hoe, the ice axe): up over the head and down on the rock in front
    ('pick', [
        ('up', P(chest=(-10, 0, -12), armW=(-158, 32, 0), aim=(140, 44, 0), off=4)),
        ('swing', P(chest=(14, 0, 0), armW=(-92, 0, 0), aim=(0, -8, 0), off=4, **crouch(8, 14))),
        ('strike', P(chest=(26, 0, 0), armW=(-56, 0, 0), aim=(0, -62, 0), off=4, **crouch(22, 38))),
    ]),
]

# the dodge roll: a dive, tucked tight and turned head over heels, up again (no weapon drawn)
_tuck = dict(chest=(58, 0, 0), armW=(-96, 0, 34), armO=(-96, 0, -34), head=(30, 0, 0), hide=True, **crouch(104, 150))   # balled up tight
ROLL = [
    ('dive', P(chest=(30, 0, 0), armW=(-70, 0, 6), armO=(-70, 0, -6), hide=True, **crouch(44, 70))),
    ('tuck1', P(tumble=80, **_tuck)),
    ('tuck2', P(tumble=170, **_tuck)),
    ('tuck3', P(tumble=260, **_tuck)),
    ('rise', P(chest=(16, 0, 0), armW=(-30, 0, 10), armO=(-30, 0, -10), hide=True, **crouch(30, 50))),
]

# the bow (Sylvara's bowyer, Aerin's range): its poses are a sheet of their own — pilot-bow[-<style>]-<a|b>-<head>.png,
# laid out in assets/characters/bow.json — so the attack sheets above never need re-rendering for it. The bow is in
# the weapon hand held out toward the mark (aim), the other hand draws the string back to the chin (off < 0: that far
# behind the grip along the arrow); `draw` pulls the string to that hand, `arrow` shows one nocked.
BOW = [
    ('nock', P(chest=(2, 0, 20), armW=(-60, 6, -22), aim=(0, -16, -30), off=-2.5, draw=True, arrow=True)),
    ('draw', P(chest=(0, 0, 38), armW=(-86, 4, -40), aim=(0, 2, -30), off=-5.5, draw=True, arrow=True, **crouch(6, 10))),
    ('full', P(chest=(-4, 0, 48), armW=(-90, 4, -50), aim=(0, 4, -30), off=-9.0, draw=True, arrow=True, **crouch(10, 16))),
    ('loose', P(chest=(-2, 0, 44), armW=(-92, 4, -46), aim=(0, 3, -30), armO=(40, -40, 0), **crouch(8, 12))),
    ('lower', P(chest=(4, 0, 16), armW=(-40, 4, -14), aim=(0, -30, -20), armO=(14, -8, 0))),
]
BOW_COLS = [('bow-' + n, s) for n, s in BOW]

COLS = [(c + '-' + n, spec) for c, frames in CLASSES for n, spec in frames] + [('roll-' + n, s) for n, s in ROLL]
COLNAMES = [n for n, _ in COLS]
DIRS = [('down', 0), ('right', 90), ('up', 180), ('left', -90)]

# how each class carries its weapon while standing and walking (the walk sheet's own arm swing; only the aim and
# the other hand are set): blades forward and down, the pike and staff upright, the maul over the shoulder
CARRY = {
    'blade': dict(aim=(0, -58, 0)),
    'sword': dict(aim=(4, -52, 0)),
    'chop': dict(aim=(0, -40, 0)),
    'pole': dict(aim=(0, 86, 0)),
    'maul': dict(aim=(176, 68, 0)),
    'cast': dict(aim=(0, 84, 0)),
    'pick': dict(aim=(0, -36, 0)),
    'bow': dict(aim=(0, 8, 0)),           # held by the grip at the side, upright, the string toward you
}


def leg_drop(spec):
    """How far the body sinks so the lower foot stays on the ground (characters.py legs: thigh 4.2, boot sole 4.65
    below the knee)."""
    import math
    def depth(h, k):
        return 4.2 * math.cos(math.radians(h)) + 4.65 * math.cos(math.radians(h + k))
    d = max(depth(spec['hipW'][0], spec['kneeW']), depth(spec['hipO'][0], spec['kneeO']))
    return 8.85 - d


def layout():
    """What the game needs to play the sheet: frame size, origin, and the column of each pose."""
    return {
        'frame': list(FRAME), 'origin': list(ORIGIN), 'rows': [d for d, _ in DIRS],
        'cols': COLNAMES,
        'classes': {c: [n for n, _ in frames] for c, frames in CLASSES},
        'roll': [n for n, _ in ROLL],
    }


def bow_layout():
    """The bow's own sheet (pilot-bow-…png): the same frame and rows as the attack sheet, its own columns."""
    return {'frame': list(FRAME), 'origin': list(ORIGIN), 'rows': [d for d, _ in DIRS], 'cols': [n for n, _ in BOW_COLS]}


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, '..', '..', 'apps', 'bridge', 'assets', 'characters', 'attacks.json')
    with open(out, 'w') as f:
        json.dump(layout(), f, separators=(',', ':'))
    print(os.path.normpath(out), len(COLNAMES), 'columns')
    with open(os.path.join(os.path.dirname(out), 'bow.json'), 'w') as f:
        json.dump(bow_layout(), f, separators=(',', ':'))
