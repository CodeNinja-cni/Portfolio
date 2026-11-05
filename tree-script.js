/* ════════════════════════════════════════════════
   PROJECT TREE ANIMATION
   Add this block to script.js (or paste at the end)
   ════════════════════════════════════════════════

   How it works:
   1. On scroll into view, the root node is already visible
   2. For each card: draw a curved SVG bezier branch from the
      root outward, then pop the tip dot, then fade-scale the card in
   3. Layout: 3 cards left / 3 cards right, fanning outward
   4. Mobile (<700px): SVG hidden, cards stacked vertically
   ════════════════════════════════════════════════ */

(function initProjectTree() {
  const wrapper = document.getElementById("project-tree");
  const svg     = document.getElementById("tree-svg");
  const root    = document.getElementById("tree-root");
  if (!wrapper || !svg || !root) return;

  /* ── SVG gradient definition ── */
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <linearGradient id="branchGrad" x1="0%" y1="0%" x2="100%" y2="0%" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#6366F1" stop-opacity="0.9"/>
      <stop offset="50%"  stop-color="#8B5CF6" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#38BDF8" stop-opacity="0.7"/>
    </linearGradient>
  `;
  svg.appendChild(defs);

  const cards = Array.from(wrapper.querySelectorAll(".tree-card"));
  const CARD_W = 280;
  const CARD_H_EST = 340; // estimated — recalculated after layout

  /* ── Layout calculation ── */
  function layout() {
    if (window.innerWidth <= 700) return; // mobile handled by CSS

    const wrapW = wrapper.offsetWidth;
    const centerX = wrapW / 2;
    const ROOT_H = root.offsetHeight;
    const ROOT_Y = ROOT_H + 20; // root bottom + gap

    // Fan angles for 6 cards: 3 left, 3 right
    // Left cards: angles 210°, 240°, 270° (pointing left-down)
    // Right cards: angles 330°, 300°, 270° (pointing right-down)
    // We use a simpler explicit grid: 3 columns left + 3 columns right
    const GAP_X = 36;   // horizontal gap between card columns
    const GAP_Y = 30;   // vertical gap between card rows

    // Left side: cards 0, 2, 4  (col 0 = outer, col 1 = mid, col 2 = inner)
    // Right side: cards 1, 3, 5
    const colInnerX = centerX - CARD_W - GAP_X;      // inner left col right edge → card left = colInnerX - CARD_W
    const colMidX   = centerX - CARD_W*2 - GAP_X*2;
    const colOuterX = centerX - CARD_W*3 - GAP_X*3;

    // Left col positions (card left x):
    const LEFT_COLS  = [colInnerX, colMidX, colOuterX];
    const RIGHT_COLS = [
      centerX + GAP_X,
      centerX + CARD_W + GAP_X*2,
      centerX + CARD_W*2 + GAP_X*3,
    ];

    // Row Y positions: stagger rows to create the fan shape
    const ROW_YS = [ROOT_Y + 20, ROOT_Y + 200, ROOT_Y + 380];

    // Assign positions: left[0,2,4] → cols [inner,mid,outer], rows [0,1,2]
    //                   right[1,3,5] → cols [inner,mid,outer], rows [0,1,2]
    const positions = [
      { x: LEFT_COLS[0],  y: ROW_YS[0] }, // card 0
      { x: RIGHT_COLS[0], y: ROW_YS[0] }, // card 1
      { x: LEFT_COLS[1],  y: ROW_YS[1] }, // card 2
      { x: RIGHT_COLS[1], y: ROW_YS[1] }, // card 3
      { x: LEFT_COLS[2],  y: ROW_YS[2] }, // card 4
      { x: RIGHT_COLS[2], y: ROW_YS[2] }, // card 5
    ];

    // Clamp to viewport
    cards.forEach((card, i) => {
      if (!positions[i]) return;
      let x = Math.max(0, Math.min(positions[i].x, wrapW - CARD_W));
      let y = positions[i].y;
      card.style.left   = x + "px";
      card.style.top    = y + "px";
      card.style.width  = CARD_W + "px";
      card.dataset.posX = x;
      card.dataset.posY = y;
    });

    // Set wrapper height to fit all cards
    const maxBottom = Math.max(...cards.map(c => +c.dataset.posY + c.offsetHeight + 40));
    wrapper.style.height = maxBottom + "px";

    // Draw branches
    drawBranches(centerX, ROOT_H / 2 + 10, positions);
  }

  /* ── Draw SVG branches ── */
  function drawBranches(rootCX, rootCY, positions) {
    // Clear old paths
    svg.querySelectorAll(".tree-branch, .tree-tip-dot").forEach(el => el.remove());

    const rootBottom = root.offsetHeight;

    cards.forEach((card, i) => {
      if (!positions[i]) return;
      const pos    = positions[i];
      const cardCX = pos.x + CARD_W / 2;
      const cardCY = pos.y;           // top of card

      // Control points for cubic bezier — creates a natural branch curve
      const startX = rootCX;
      const startY = rootBottom - 4;  // bottom of root node
      const endX   = cardCX;
      const endY   = cardCY + 20;     // top of card, slightly inside

      // Bezier control points: drop straight down first, then curve to card
      const cp1X = startX;
      const cp1Y = startY + (endY - startY) * 0.45;
      const cp2X = endX;
      const cp2Y = startY + (endY - startY) * 0.55;

      const d = `M${startX},${startY} C${cp1X},${cp1Y} ${cp2X},${cp2Y} ${endX},${endY}`;

      // Approximate path length for dash animation
      const dx = endX - startX, dy = endY - startY;
      const approxLen = Math.round(Math.sqrt(dx*dx + dy*dy) * 1.35);

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.classList.add("tree-branch");
      path.style.setProperty("--branch-len", approxLen);
      path.style.strokeDasharray  = approxLen;
      path.style.strokeDashoffset = approxLen;
      path.dataset.index = i;
      svg.appendChild(path);

      // Tip dot at card end
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", endX);
      dot.setAttribute("cy", endY);
      dot.setAttribute("r",  5);
      dot.classList.add("tree-tip-dot");
      dot.dataset.index = i;
      svg.appendChild(dot);
    });
  }

  /* ── Animate branches in sequence ── */
  function animateBranches() {
    const branches = Array.from(svg.querySelectorAll(".tree-branch"));
    const dots     = Array.from(svg.querySelectorAll(".tree-tip-dot"));

    branches.forEach((branch, i) => {
      const delay = i * 160; // stagger each branch 160ms

      // Draw branch
      setTimeout(() => {
        branch.style.transition =
          `stroke-dashoffset 0.85s cubic-bezier(0.4,0,0.2,1) ${delay}ms`;
        branch.classList.add("drawn");
      }, 10);

      // Tip dot appears when branch finishes
      setTimeout(() => {
        if (dots[i]) dots[i].classList.add("shown");
      }, delay + 850);

      // Card pops in after dot
      setTimeout(() => {
        if (cards[i]) cards[i].classList.add("active");
      }, delay + 1050);
    });
  }

  /* ── Intersection Observer — trigger when section in view ── */
  let animated = false;
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !animated) {
      animated = true;
      // Small delay so layout is stable
      setTimeout(animateBranches, 200);
    }
  }, { threshold: 0.12 });

  obs.observe(wrapper);

  /* ── Init & resize ── */
  layout();
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Clear animation state on resize so it re-runs correctly
      cards.forEach(c => c.classList.remove("active"));
      svg.querySelectorAll(".tree-branch, .tree-tip-dot").forEach(el => el.remove());
      animated = false;
      layout();
    }, 250);
  });

})();
