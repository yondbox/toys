export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // 日本語件名に大文字略語（AI など）が含まれると upper-case と
    // 誤判定されるため無効化する
    "subject-case": [0],
  },
};
