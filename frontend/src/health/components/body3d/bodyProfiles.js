// Illustrative adult proportions, not population reference values or a reconstruction of the user.
export const BODY_PROFILES = {
  male: { label:'남성 인체 모형', shoulder:0.205, chest:0.166, waist:0.121, hip:0.142, depth:0.104, arm:0.054, thigh:0.084 },
  female: { label:'여성 인체 모형', shoulder:0.168, chest:0.148, waist:0.106, hip:0.169, depth:0.108, arm:0.045, thigh:0.088 },
  unspecified: { label:'중립 인체 모형', shoulder:0.184, chest:0.156, waist:0.117, hip:0.156, depth:0.104, arm:0.049, thigh:0.086 },
};
export const resolveBodyProfile = gender => BODY_PROFILES[gender] || BODY_PROFILES.unspecified;
