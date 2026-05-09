// Hand-curated opening lines. SAN moves only — chess.js handles the rest.
// `side` is which color you're learning (you play those moves).
// `line` alternates: if side=white, you play index 0, 2, 4...; if black, 1, 3, 5...

export const OPENINGS = [
  {
    id: "italian",
    name: "Italian Game",
    eco: "C50",
    side: "white",
    description: "Classic open game. Quick development, central control, the bishop eyes f7.",
    line: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4", "exd4"]
  },
  {
    id: "ruy-lopez",
    name: "Ruy Lopez",
    eco: "C60",
    side: "white",
    description: "The Spanish. Pressure the e5 pawn by attacking its defender. Deeply principled.",
    line: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7"]
  },
  {
    id: "vienna",
    name: "Vienna Game",
    eco: "C25",
    side: "white",
    description: "Sneaky alternative to the Italian. Develops the knight first, leaves f-pawn options open.",
    line: ["e4", "e5", "Nc3", "Nf6", "Bc4", "Nxe4", "Qh5", "Nd6", "Bb3", "Nc6"]
  },
  {
    id: "queens-gambit",
    name: "Queen's Gambit",
    eco: "D06",
    side: "white",
    description: "Offer a pawn to control the center. Black usually declines and a long strategic game begins.",
    line: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Be7", "e3", "O-O"]
  },
  {
    id: "london",
    name: "London System",
    eco: "D02",
    side: "white",
    description: "Same setup against almost anything. Bf4, e3, Nf3, Bd3, c3 — solid and easy to learn.",
    line: ["d4", "d5", "Nf3", "Nf6", "Bf4", "c5", "e3", "Nc6", "c3", "e6"]
  },
  {
    id: "english",
    name: "English Opening",
    eco: "A20",
    side: "white",
    description: "Flank attack. Pressures d5 from the queenside, often transposes to other openings.",
    line: ["c4", "e5", "Nc3", "Nf6", "g3", "d5", "cxd5", "Nxd5", "Bg2", "Nb6"]
  },

  {
    id: "sicilian-najdorf",
    name: "Sicilian Najdorf",
    eco: "B90",
    side: "black",
    description: "The sharpest reply to 1.e4. ...a6 prepares ...e5 or ...b5, fights for the long diagonal.",
    line: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"]
  },
  {
    id: "french",
    name: "French Defense",
    eco: "C00",
    side: "black",
    description: "Solid and a little stubborn. The pawn chain locks the center; play breaks on the flanks.",
    line: ["e4", "e6", "d4", "d5", "Nc3", "Bb4", "e5", "c5", "a3", "Bxc3+"]
  },
  {
    id: "caro-kann",
    name: "Caro-Kann",
    eco: "B10",
    side: "black",
    description: "The 'good French' — solid pawn structure without locking in the bishop.",
    line: ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4", "Bf5", "Ng3", "Bg6"]
  },
  {
    id: "kings-indian",
    name: "King's Indian Defense",
    eco: "E60",
    side: "black",
    description: "Cede the center, then attack it. Fianchettoed bishop, kingside pawn storm later.",
    line: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6", "Nf3", "O-O"]
  },
  {
    id: "slav",
    name: "Slav Defense",
    eco: "D10",
    side: "black",
    description: "Hold d5 with a pawn instead of giving it up. Solid, with active piece play.",
    line: ["d4", "d5", "c4", "c6", "Nf3", "Nf6", "Nc3", "dxc4", "a4", "Bf5"]
  },
  {
    id: "scandinavian",
    name: "Scandinavian Defense",
    eco: "B01",
    side: "black",
    description: "Direct challenge to e4 on move one. Get the queen out early, accept it'll move twice.",
    line: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qa5", "d4", "Nf6", "Nf3", "c6"]
  }
];
