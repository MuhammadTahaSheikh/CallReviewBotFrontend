import { scoreTone } from "../../lib/format";

export default function ScoreBar({ label, score, weight, evidence }) {
  const tone = scoreTone(score);
  const width = score == null ? 0 : Math.max(0, Math.min(100, score));

  return (
    <div className="score-bar">
      <div className="score-bar-head">
        <div>
          <span className="score-bar-label">{label}</span>
          {weight != null ? <span className="score-bar-weight">{weight}% weight</span> : null}
        </div>
        <span className={`score-bar-value tone-${tone}`}>{score == null ? "N/A" : score}</span>
      </div>
      <div className="score-bar-track" role="presentation">
        <div className={`score-bar-fill tone-${tone}`} style={{ width: `${width}%` }} />
      </div>
      {evidence ? <p className="score-bar-evidence">“{evidence}”</p> : null}
    </div>
  );
}
