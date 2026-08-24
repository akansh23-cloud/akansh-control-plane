/**
 * Shoulder-relative IK targets for each station's tool.
 *
 * The figure faces right, so a tool held in front means BOTH hands sit at
 * positive x. Distances are tuned to roughly 60–92% of total arm reach: too
 * close and the elbow folds into a hands-on-hips silhouette, too far and the
 * arm locks straight and stops reading as "holding".
 *
 * Plain module so both the JSX tools and the headless preview can read it.
 */
export const TOOL_RIG = {
  //            far arm (l)        near arm (r)
  cards:     { hands: { l: [ 46,  74], r: [ 70,  68] } },
  teletype:  { hands: { l: [ 34,  80], r: [ 70,  54] } },
  rack:      { hands: { l: [ 78,   6], r: [ 64,  50] } },
  wall:      { hands: { l: [ 76,  22], r: [ 26,  72] } },
  elastic:   { hands: { l: [ 62, -38], r: [ 30,  66] } },
  word:      { hands: { l: [ 66,  26], r: [ 74,  40] } },
  iac:       { hands: { l: [ 52,  60], r: [ 76,  52] } },
  container: { hands: { l: [ 64,  20], r: [ 52,  58] } },
  desired:   { hands: { l: [ 66, -26], r: [ 34,  62] } },
  feedback:  { hands: { l: [ 70,   2], r: [ 88,  30] } },
  signed:    { hands: { l: [ 70, -18], r: [ 60,  58] } },
  golden:    { hands: { l: [ 56,  58], r: [ 86,  18] } },
};

/** Headset appears once being on-call becomes part of the job. */
export const HEADSET_FROM = 2;
