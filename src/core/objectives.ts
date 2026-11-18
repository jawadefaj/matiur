// The objective list every mechanic shows: a hint line, the pause menu and the
// results card all read it.

export interface Objective {
  id: string;
  label: string;
  state: 'pending' | 'active' | 'done' | 'failed';
  /** Short text such as '2/3' or '45%', shown after the hint and in the pause menu. */
  progress?: string;
}
