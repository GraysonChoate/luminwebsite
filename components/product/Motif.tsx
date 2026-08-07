import type { PageMode } from "@/lib/productSignatures";
import styles from "./Motif.module.css";

/**
 * THE MOTIF — a bespoke figure behind each product's stage.
 *
 * One per page mode, drawn in SVG so it stays crisp and weighs nothing, and
 * animated in CSS so it costs no main thread. Each one is a diagram of what the
 * product DOES, not an ornament: `orbit` returns to where it started, `ledger`
 * scans down rows, `macro` fills ratios, `rhythm` beats.
 *
 * They sit at low opacity behind the wordmark. The approved scene plate is
 * still the room; this is the instrument drawn over it.
 */
export default function Motif({ mode }: { mode: PageMode }) {
  return (
    <div className={`${styles.motif} ${styles[mode]}`} aria-hidden="true">
      <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
        {mode === "orbit" && (
          <>
            <circle className={styles.ring} cx="200" cy="200" r="160" />
            <circle className={styles.ring} cx="200" cy="200" r="112" />
            <circle className={styles.ring} cx="200" cy="200" r="64" />
            <g className={styles.spin}>
              <circle className={styles.token} cx="200" cy="40" r="7" />
            </g>
            <g className={`${styles.spin} ${styles.spinSlow}`}>
              <circle className={styles.token} cx="200" cy="88" r="5" />
            </g>
          </>
        )}

        {mode === "lattice" && (
          <>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <line key={`v${i}`} className={styles.beam} x1={40 + i * 64} y1="40" x2={40 + i * 64} y2="360" />
            ))}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <line key={`h${i}`} className={styles.beam} x1="40" y1={40 + i * 64} x2="360" y2={40 + i * 64} />
            ))}
            {[0, 1, 2, 3, 4].map((i) => (
              <circle key={i} className={styles.joint} cx={72 + i * 64} cy={72 + i * 64} r="4"
                style={{ animationDelay: `${i * 0.3}s` }} />
            ))}
          </>
        )}

        {mode === "thread" && (
          <>
            <line className={styles.spine} x1="200" y1="20" x2="200" y2="380" />
            {[70, 140, 210, 280].map((y, i) => (
              <g key={y} style={{ animationDelay: `${i * 0.5}s` }} className={styles.msg}>
                <rect x={i % 2 ? 214 : 96} y={y - 14} width="90" height="28" rx="3" />
                <circle cx="200" cy={y} r="5" />
              </g>
            ))}
            <circle className={styles.pulse} cx="200" cy="20" r="6" />
          </>
        )}

        {mode === "console" && (
          <>
            {[[40, 40], [216, 40], [40, 150], [216, 150], [40, 260], [216, 260]].map(([x, y], i) => (
              <rect key={i} className={styles.pane} x={x} y={y} width="144" height="90" rx="2"
                style={{ animationDelay: `${i * 0.22}s` }} />
            ))}
            <line className={styles.sweep} x1="0" y1="0" x2="400" y2="0" />
          </>
        )}

        {mode === "ledger" && (
          <>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <g key={i} className={styles.row} style={{ animationDelay: `${i * 0.18}s` }}>
                <line x1="40" y1={70 + i * 44} x2="360" y2={70 + i * 44} />
                <rect x="40" y={56 + i * 44} width="34" height="10" />
                <rect x="92" y={56 + i * 44} width={70 + (i % 3) * 40} height="10" />
              </g>
            ))}
          </>
        )}

        {mode === "curriculum" && (
          <>
            <line className={styles.spine} x1="70" y1="40" x2="70" y2="360" />
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i} className={styles.step} style={{ animationDelay: `${i * 0.34}s` }}>
                <circle cx="70" cy={70 + i * 66} r="9" />
                <rect x="100" y={62 + i * 66} width={130 + i * 32} height="16" rx="2" />
              </g>
            ))}
          </>
        )}

        {mode === "kinetic" && (
          <>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <path key={i} className={styles.trail}
                d={`M ${20 + i * 12} 380 Q ${140 + i * 20} ${240 - i * 26} ${380} ${120 - i * 8}`}
                style={{ animationDelay: `${i * 0.16}s` }} />
            ))}
            <circle className={styles.mover} cx="0" cy="0" r="6" />
          </>
        )}

        {mode === "rhythm" && (
          <>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <rect key={i} className={styles.bar} x={40 + i * 42} y="140" width="20" height="120" rx="2"
                style={{ animationDelay: `${i * 0.11}s` }} />
            ))}
            <line className={styles.beat} x1="30" y1="290" x2="370" y2="290" />
          </>
        )}

        {mode === "device" && (
          <>
            <rect className={styles.bezel} x="118" y="42" width="164" height="300" rx="10" />
            <rect className={styles.screen} x="132" y="58" width="136" height="268" rx="5" />
            <line className={styles.scanline} x1="132" y1="70" x2="268" y2="70" />
            <circle className={styles.joint} cx="200" cy="330" r="4" />
          </>
        )}

        {mode === "shelf" && (
          <>
            {[0, 1, 2].map((s) => (
              <g key={s}>
                <line className={styles.shelfLine} x1="40" y1={130 + s * 92} x2="360" y2={130 + s * 92} />
                {[0, 1, 2, 3].map((i) => (
                  <rect key={i} className={styles.good} x={56 + i * 78} y={130 + s * 92 - 46} width="42" height="46" rx="3"
                    style={{ animationDelay: `${(s * 4 + i) * 0.1}s` }} />
                ))}
              </g>
            ))}
          </>
        )}

        {mode === "macro" && (
          <>
            <circle className={styles.track} cx="200" cy="200" r="140" />
            <circle className={styles.track} cx="200" cy="200" r="104" />
            <circle className={styles.track} cx="200" cy="200" r="68" />
            <circle className={`${styles.fill} ${styles.fillA}`} cx="200" cy="200" r="140" />
            <circle className={`${styles.fill} ${styles.fillB}`} cx="200" cy="200" r="104" />
            <circle className={`${styles.fill} ${styles.fillC}`} cx="200" cy="200" r="68" />
          </>
        )}
      </svg>
    </div>
  );
}
