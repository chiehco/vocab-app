"""Only independently reviewed U16 G051 and seven status rows. No runtime output reads."""
import json
EXPECTED = json.loads(r'''[
  {
    "dataset": "curriculum",
    "path": "src/features/direct/curriculumLV3Unit16.json",
    "key": "learningItemId",
    "id": "LI-LV3U16-G051",
    "before": {
      "learningItemId": "LI-LV3U16-G051",
      "kind": "grammar",
      "sourcePage": 172,
      "pattern": "now that \u8996\u70ba\u9023\u63a5\u8a5e\uff0c\u7b49\u65bc since\uff0c\u8868\u300c\u65e2\u7136\u300d\uff0c\u6240\u5f15\u5c0e\u7684\u526f\u8a5e\u5b50\u53e5\u61c9\u63a1\u73fe\u5728\u5f0f\u6216\u73fe\u5728\u5b8c\u6210\u5f0f",
      "explanationZh": "\u6559\u6750\u7528\u6cd5\u6a19\u8a18\uff1b\u4f8b\u53e5\u8207\u6559\u6750\u984c\u76ee\u5c1a\u672a\u63d0\u4f9b\u3002",
      "review": "source_checked_text_only",
      "practiceMode": "read_only"
    },
    "after": {
      "explanationZh": "now that \u4f5c\u9023\u63a5\u8a5e\uff0c\u8868\u793a\u65e2\u7136\u3001\u7531\u65bc\u73fe\u5728\u9019\u7a2e\u60c5\u6cc1\u3002\u6642\u614b\u4f9d\u8a9e\u5883\u9078\u64c7\uff0c\u4e5f\u53ef\u7528\u904e\u53bb\u5f0f\u63cf\u8ff0\u904e\u53bb\u60c5\u5883\uff1b\u4e0d\u53ef\u56e0\u542b now \u5c31\u9650\u5b9a\u53ea\u80fd\u7528\u73fe\u5728\u5f0f\u6216\u73fe\u5728\u5b8c\u6210\u5f0f\u3002",
      "pattern": "now that...\uff08\u65e2\u7136\u2026\u2026\uff09"
    },
    "reason": "Replace inherited generic summary or placeholder with this printed chapter occurrence and explicit source-backed explanation; preserve IDs, original sentences, status and read_only boundaries. Replace inherited generic summary or placeholder with this printed chapter occurrence and explicit source-backed explanation; preserve IDs, original sentences, status and read_only boundaries.",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/now"
    ],
    "fieldEvidence": {
      "explanationZh": [
        {
          "proposal": "U16-SOURCE-LI-LV3U16-G051",
          "originFindingIds": [
            "U16-SOURCE-LI-LV3U16-G051"
          ],
          "reason": "Replace inherited generic summary or placeholder with this printed chapter occurrence and explicit source-backed explanation; preserve IDs, original sentences, status and read_only boundaries.",
          "sources": [
            {
              "type": "textbook_photo",
              "file": "20260815_105539.jpg",
              "page": 172,
              "sha256": "2917310620179f8f4584fed3d65b2c475a9c96c2b66204355a1e4b8fcd1bc739",
              "verification": "pixels_displayed_and_visually_read",
              "printedExcerpt": "now that",
              "normalizedSourceSummary": "now that \u4f5c\u9023\u63a5\u8a5e\uff0c\u8868\u793a\u65e2\u7136\u3001\u7531\u65bc\u73fe\u5728\u9019\u7a2e\u60c5\u6cc1\u3002\u6642\u614b\u4f9d\u8a9e\u5883\u9078\u64c7\uff0c\u4e5f\u53ef\u7528\u904e\u53bb\u5f0f\u63cf\u8ff0\u904e\u53bb\u60c5\u5883\uff1b\u4e0d\u53ef\u56e0\u542b now \u5c31\u9650\u5b9a\u53ea\u80fd\u7528\u73fe\u5728\u5f0f\u6216\u73fe\u5728\u5b8c\u6210\u5f0f\u3002",
              "excerptNormalization": "Only the quoted short English token or phrase is a printed excerpt; apostrophes and spacing may be normalized. Chinese explanation and contextual qualifications are separate editorial summaries; no complete textbook example sentence adopted."
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/now",
              "verification": "direct_page_body_read",
              "claim": "Dictionary conjunction entry includes past-tense now that; textbook absolute tense restriction is incorrect.",
              "evidenceArtifact": "general/nowSinceBody-raw.json",
              "evidenceRawSha256": "8438991852d989e3ccb97bec93fd167c6e5c79d343db51959f15ffd21dcff5fc"
            }
          ],
          "beforePresent": true
        }
      ],
      "pattern": [
        {
          "proposal": "U16-SOURCE-LI-LV3U16-G051",
          "originFindingIds": [
            "U16-SOURCE-LI-LV3U16-G051"
          ],
          "reason": "Replace inherited generic summary or placeholder with this printed chapter occurrence and explicit source-backed explanation; preserve IDs, original sentences, status and read_only boundaries.",
          "sources": [
            {
              "type": "textbook_photo",
              "file": "20260815_105539.jpg",
              "page": 172,
              "sha256": "2917310620179f8f4584fed3d65b2c475a9c96c2b66204355a1e4b8fcd1bc739",
              "verification": "pixels_displayed_and_visually_read",
              "printedExcerpt": "now that",
              "normalizedSourceSummary": "now that \u4f5c\u9023\u63a5\u8a5e\uff0c\u8868\u793a\u65e2\u7136\u3001\u7531\u65bc\u73fe\u5728\u9019\u7a2e\u60c5\u6cc1\u3002\u6642\u614b\u4f9d\u8a9e\u5883\u9078\u64c7\uff0c\u4e5f\u53ef\u7528\u904e\u53bb\u5f0f\u63cf\u8ff0\u904e\u53bb\u60c5\u5883\uff1b\u4e0d\u53ef\u56e0\u542b now \u5c31\u9650\u5b9a\u53ea\u80fd\u7528\u73fe\u5728\u5f0f\u6216\u73fe\u5728\u5b8c\u6210\u5f0f\u3002",
              "excerptNormalization": "Only the quoted short English token or phrase is a printed excerpt; apostrophes and spacing may be normalized. Chinese explanation and contextual qualifications are separate editorial summaries; no complete textbook example sentence adopted."
            },
            {
              "type": "dictionary",
              "url": "https://www.collinsdictionary.com/dictionary/english/now",
              "verification": "direct_page_body_read",
              "claim": "Dictionary conjunction entry includes past-tense now that; textbook absolute tense restriction is incorrect.",
              "evidenceArtifact": "general/nowSinceBody-raw.json",
              "evidenceRawSha256": "8438991852d989e3ccb97bec93fd167c6e5c79d343db51959f15ffd21dcff5fc"
            }
          ],
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "senses",
    "path": "public/data/v1/senses.json",
    "key": "senseId",
    "id": "W002139-1",
    "before": {
      "senseId": "W002139-1",
      "wordId": "W002139",
      "word": "charm",
      "senseOrder": 1,
      "sensePos": "n.",
      "meaningZh": "\u9b45\u529b\uff1b\u8b77\u8eab\u7b26",
      "isExamSense": false,
      "examEvidence": null,
      "answerForms": [],
      "note": "\u5f85\u62c6\u5206\uff1b\u4e3b\u8868\u5b57\u7fa9\uff1a\u5438\u5f15\u529b\uff1b\u9b54\u529b\uff1b\u7b26\u5492\uff1b\u8ff7\u4f4f",
      "status": "needs_check"
    },
    "after": {
      "status": "reviewed",
      "note": "2026-11-09\uff1a\u5df2\u4f9d Collins \u672c\u6587\u6838\u5c0d\u672c\u5217\u8a5e\u6027\u8207\u8a5e\u7fa9\uff1b\u540d\u8a5e\u9b45\u529b\uff0f\u8b77\u8eab\u7b26\u53ca\u52d5\u8a5e\u8ff7\u4f4f\u5747\u6709\u76f4\u63a5\u4f9d\u64da\u3002\u4fdd\u7559\u539f\u7fa9\u9805\u5206\u7d44\uff0c\u672a\u5c07\u672c\u5217\u6838\u5c0d\u7576\u4f5c\u6574\u8a5e\u3001\u5716\u7247\u6216\u8003\u984c\u4f86\u6e90\u901a\u904e\u3002"
    },
    "reason": "\u5be6\u969b\u6838\u5c0d\u6b64\u7fa9\u9805\u7684\u8a5e\u6027\u8207\u4e2d\u6587\u5b9a\u7fa9\u5f8c\u6a19\u8a18\u4ee3\u7406\u5df2\u5be9\u95b1\uff1b\u4e0d\u8868\u793a\u4f7f\u7528\u8005\u9a57\u6536\u3002 \u5be6\u969b\u6838\u5c0d\u6b64\u7fa9\u9805\u7684\u8a5e\u6027\u8207\u4e2d\u6587\u5b9a\u7fa9\u5f8c\u6a19\u8a18\u4ee3\u7406\u5df2\u5be9\u95b1\uff1b\u4e0d\u8868\u793a\u4f7f\u7528\u8005\u9a57\u6536\u3002",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/charm"
    ],
    "fieldEvidence": {
      "status": [
        {
          "proposal": "U16-STATUS-REVIEW-SENSES-W002139-1-STATUS",
          "originFindingIds": [
            "U16-STATUS-REVIEW-SENSES-W002139-1-STATUS"
          ],
          "reason": "\u5be6\u969b\u6838\u5c0d\u6b64\u7fa9\u9805\u7684\u8a5e\u6027\u8207\u4e2d\u6587\u5b9a\u7fa9\u5f8c\u6a19\u8a18\u4ee3\u7406\u5df2\u5be9\u95b1\uff1b\u4e0d\u8868\u793a\u4f7f\u7528\u8005\u9a57\u6536\u3002",
          "sources": [
            {
              "url": "https://www.collinsdictionary.com/dictionary/english/charm",
              "claim": "\u672c\u6587\u540c\u6642\u652f\u6301\u9b45\u529b\u3001\u8b77\u8eab\u7b26\u548c\u8ff7\u4f4f\u7684\u540d\u8a5e/\u52d5\u8a5e\u7fa9\u3002",
              "verification": "direct_dictionary_body_read",
              "readDate": "2026-11-09",
              "artifacts": [
                {
                  "artifact": "output/lv3-audit-20261107/u16-source/general/extraBodies-raw.json",
                  "sha256": "3014d38c5e3b7d6d0d5fed7e39419bf422b883859f58ac026055221bb4143b4e"
                }
              ]
            }
          ],
          "beforePresent": true
        }
      ],
      "note": [
        {
          "proposal": "U16-STATUS-REVIEW-SENSES-W002139-1-NOTE",
          "originFindingIds": [
            "U16-STATUS-REVIEW-SENSES-W002139-1-NOTE"
          ],
          "reason": "\u5be6\u969b\u6838\u5c0d\u6b64\u7fa9\u9805\u7684\u8a5e\u6027\u8207\u4e2d\u6587\u5b9a\u7fa9\u5f8c\u6a19\u8a18\u4ee3\u7406\u5df2\u5be9\u95b1\uff1b\u4e0d\u8868\u793a\u4f7f\u7528\u8005\u9a57\u6536\u3002",
          "sources": [
            {
              "url": "https://www.collinsdictionary.com/dictionary/english/charm",
              "claim": "\u672c\u6587\u540c\u6642\u652f\u6301\u9b45\u529b\u3001\u8b77\u8eab\u7b26\u548c\u8ff7\u4f4f\u7684\u540d\u8a5e/\u52d5\u8a5e\u7fa9\u3002",
              "verification": "direct_dictionary_body_read",
              "readDate": "2026-11-09",
              "artifacts": [
                {
                  "artifact": "output/lv3-audit-20261107/u16-source/general/extraBodies-raw.json",
                  "sha256": "3014d38c5e3b7d6d0d5fed7e39419bf422b883859f58ac026055221bb4143b4e"
                }
              ]
            }
          ],
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "senses",
    "path": "public/data/v1/senses.json",
    "key": "senseId",
    "id": "W002139-2",
    "before": {
      "senseId": "W002139-2",
      "wordId": "W002139",
      "word": "charm",
      "senseOrder": 2,
      "sensePos": "v.",
      "meaningZh": "\u8ff7\u4f4f",
      "isExamSense": false,
      "examEvidence": null,
      "answerForms": [],
      "note": "\u5f85\u62c6\u5206\uff1b\u4e3b\u8868\u5b57\u7fa9\uff1a\u5438\u5f15\u529b\uff1b\u9b54\u529b\uff1b\u7b26\u5492\uff1b\u8ff7\u4f4f",
      "status": "needs_check"
    },
    "after": {
      "status": "reviewed",
      "note": "2026-11-09\uff1a\u5df2\u4f9d Collins \u672c\u6587\u6838\u5c0d\u672c\u5217\u8a5e\u6027\u8207\u8a5e\u7fa9\uff1b\u540d\u8a5e\u9b45\u529b\uff0f\u8b77\u8eab\u7b26\u53ca\u52d5\u8a5e\u8ff7\u4f4f\u5747\u6709\u76f4\u63a5\u4f9d\u64da\u3002\u4fdd\u7559\u539f\u7fa9\u9805\u5206\u7d44\uff0c\u672a\u5c07\u672c\u5217\u6838\u5c0d\u7576\u4f5c\u6574\u8a5e\u3001\u5716\u7247\u6216\u8003\u984c\u4f86\u6e90\u901a\u904e\u3002"
    },
    "reason": "\u5be6\u969b\u6838\u5c0d\u6b64\u7fa9\u9805\u7684\u8a5e\u6027\u8207\u4e2d\u6587\u5b9a\u7fa9\u5f8c\u6a19\u8a18\u4ee3\u7406\u5df2\u5be9\u95b1\uff1b\u4e0d\u8868\u793a\u4f7f\u7528\u8005\u9a57\u6536\u3002 \u5be6\u969b\u6838\u5c0d\u6b64\u7fa9\u9805\u7684\u8a5e\u6027\u8207\u4e2d\u6587\u5b9a\u7fa9\u5f8c\u6a19\u8a18\u4ee3\u7406\u5df2\u5be9\u95b1\uff1b\u4e0d\u8868\u793a\u4f7f\u7528\u8005\u9a57\u6536\u3002",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/charm"
    ],
    "fieldEvidence": {
      "status": [
        {
          "proposal": "U16-STATUS-REVIEW-SENSES-W002139-2-STATUS",
          "originFindingIds": [
            "U16-STATUS-REVIEW-SENSES-W002139-2-STATUS"
          ],
          "reason": "\u5be6\u969b\u6838\u5c0d\u6b64\u7fa9\u9805\u7684\u8a5e\u6027\u8207\u4e2d\u6587\u5b9a\u7fa9\u5f8c\u6a19\u8a18\u4ee3\u7406\u5df2\u5be9\u95b1\uff1b\u4e0d\u8868\u793a\u4f7f\u7528\u8005\u9a57\u6536\u3002",
          "sources": [
            {
              "url": "https://www.collinsdictionary.com/dictionary/english/charm",
              "claim": "\u672c\u6587\u540c\u6642\u652f\u6301\u9b45\u529b\u3001\u8b77\u8eab\u7b26\u548c\u8ff7\u4f4f\u7684\u540d\u8a5e/\u52d5\u8a5e\u7fa9\u3002",
              "verification": "direct_dictionary_body_read",
              "readDate": "2026-11-09",
              "artifacts": [
                {
                  "artifact": "output/lv3-audit-20261107/u16-source/general/extraBodies-raw.json",
                  "sha256": "3014d38c5e3b7d6d0d5fed7e39419bf422b883859f58ac026055221bb4143b4e"
                }
              ]
            }
          ],
          "beforePresent": true
        }
      ],
      "note": [
        {
          "proposal": "U16-STATUS-REVIEW-SENSES-W002139-2-NOTE",
          "originFindingIds": [
            "U16-STATUS-REVIEW-SENSES-W002139-2-NOTE"
          ],
          "reason": "\u5be6\u969b\u6838\u5c0d\u6b64\u7fa9\u9805\u7684\u8a5e\u6027\u8207\u4e2d\u6587\u5b9a\u7fa9\u5f8c\u6a19\u8a18\u4ee3\u7406\u5df2\u5be9\u95b1\uff1b\u4e0d\u8868\u793a\u4f7f\u7528\u8005\u9a57\u6536\u3002",
          "sources": [
            {
              "url": "https://www.collinsdictionary.com/dictionary/english/charm",
              "claim": "\u672c\u6587\u540c\u6642\u652f\u6301\u9b45\u529b\u3001\u8b77\u8eab\u7b26\u548c\u8ff7\u4f4f\u7684\u540d\u8a5e/\u52d5\u8a5e\u7fa9\u3002",
              "verification": "direct_dictionary_body_read",
              "readDate": "2026-11-09",
              "artifacts": [
                {
                  "artifact": "output/lv3-audit-20261107/u16-source/general/extraBodies-raw.json",
                  "sha256": "3014d38c5e3b7d6d0d5fed7e39419bf422b883859f58ac026055221bb4143b4e"
                }
              ]
            }
          ],
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "examples",
    "path": "public/data/v1/examples.json",
    "key": "exampleId",
    "id": "EX3e5b107b",
    "before": {
      "exampleId": "EX3e5b107b",
      "word": "loose",
      "sensePos": "adj.",
      "meaningHint": "\u9b06\u7684",
      "exampleType": "exam",
      "sentenceEn": "This shirt is too loose for me.",
      "sentenceZh": "\u9019\u4ef6\u896f\u886b\u5c0d\u6211\u4f86\u8aaa\u592a\u9b06\u4e86\u3002",
      "blankSentence": "This shirt is too _____ for me.",
      "answer": "loose",
      "difficulty": "LV3",
      "status": "draft"
    },
    "after": {
      "status": "reviewed"
    },
    "reason": "\u5f62\u5bb9\u8a5e\u8868\u793a\u8863\u670d\u4e0d\u8cbc\u8eab\uff1btoo loose for me\u53ca\u4e2d\u8b6f\u4e00\u81f4\u3002 loose \u5728 is too \u5f8c\u4f5c\u8868\u8a9e\uff0c\u586b\u56de\u539f\u53e5\u4e00\u81f4\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/loose"
    ],
    "fieldEvidence": {
      "status": [
        {
          "proposal": "U16-STATUS-REVIEW-EXAMPLES-EX3e5b107b-STATUS",
          "originFindingIds": [
            "U16-STATUS-REVIEW-EXAMPLES-EX3e5b107b-STATUS"
          ],
          "reason": "\u5f62\u5bb9\u8a5e\u8868\u793a\u8863\u670d\u4e0d\u8cbc\u8eab\uff1btoo loose for me\u53ca\u4e2d\u8b6f\u4e00\u81f4\u3002 loose \u5728 is too \u5f8c\u4f5c\u8868\u8a9e\uff0c\u586b\u56de\u539f\u53e5\u4e00\u81f4\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
          "sources": [
            {
              "url": "https://www.collinsdictionary.com/dictionary/english/loose",
              "claim": "\u5f62\u5bb9\u8a5e\u8868\u793a\u8863\u670d\u4e0d\u8cbc\u8eab\uff1btoo loose for me\u53ca\u4e2d\u8b6f\u4e00\u81f4\u3002",
              "verification": "direct_dictionary_body_read",
              "readDate": "2026-11-09",
              "artifacts": [
                {
                  "artifact": "output/lv3-audit-20261107/u16-source/general/draftAndCommunicable-raw.json",
                  "sha256": "7aacab83a4c5ddfd248e6abac27f624d088fef0ea7bb200ab20f5f38c1bca3f6"
                }
              ]
            }
          ],
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "examples",
    "path": "public/data/v1/examples.json",
    "key": "exampleId",
    "id": "EX5eeb2ac7",
    "before": {
      "exampleId": "EX5eeb2ac7",
      "word": "tight",
      "sensePos": "adj.",
      "meaningHint": "\uff08\u6642\u9593\uff09\u6392\u5f97\u5f88\u6eff\u7684\uff08\u8003\u9ede\uff1aa tight schedule\uff09",
      "exampleType": "exam",
      "sentenceEn": "Her schedule is so tight that she eats lunch at her desk.",
      "sentenceZh": "\u5979\u7684\u884c\u7a0b\u6392\u5f97\u592a\u6eff\uff0c\u5348\u9910\u90fd\u5728\u8fa6\u516c\u684c\u524d\u5403\u3002",
      "blankSentence": "Her schedule is so _____ that she eats lunch at her desk.",
      "answer": "tight",
      "difficulty": "LV3",
      "status": "draft"
    },
    "after": {
      "status": "reviewed"
    },
    "reason": "tight schedule \u6307\u6642\u9593\u5b89\u6392\u7dca\u6e4a\uff0c\u5348\u9910\u4ecd\u5728\u684c\u524d\u5403\u7684\u7d50\u679c\u8207\u539f\u4e2d\u8b6f\u4e00\u81f4\u3002 tight \u4f5c\u5f62\u5bb9\u8a5e\u8868\u8a9e\uff0cso...that\u7d50\u679c\u5b50\u53e5\u8207\u4e2d\u8b6f\u4e00\u81f4\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/tight"
    ],
    "fieldEvidence": {
      "status": [
        {
          "proposal": "U16-STATUS-REVIEW-EXAMPLES-EX5eeb2ac7-STATUS",
          "originFindingIds": [
            "U16-STATUS-REVIEW-EXAMPLES-EX5eeb2ac7-STATUS"
          ],
          "reason": "tight schedule \u6307\u6642\u9593\u5b89\u6392\u7dca\u6e4a\uff0c\u5348\u9910\u4ecd\u5728\u684c\u524d\u5403\u7684\u7d50\u679c\u8207\u539f\u4e2d\u8b6f\u4e00\u81f4\u3002 tight \u4f5c\u5f62\u5bb9\u8a5e\u8868\u8a9e\uff0cso...that\u7d50\u679c\u5b50\u53e5\u8207\u4e2d\u8b6f\u4e00\u81f4\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
          "sources": [
            {
              "url": "https://www.collinsdictionary.com/dictionary/english/tight",
              "claim": "tight schedule \u6307\u6642\u9593\u5b89\u6392\u7dca\u6e4a\uff0c\u5348\u9910\u4ecd\u5728\u684c\u524d\u5403\u7684\u7d50\u679c\u8207\u539f\u4e2d\u8b6f\u4e00\u81f4\u3002",
              "verification": "direct_dictionary_body_read",
              "readDate": "2026-11-09",
              "artifacts": [
                {
                  "artifact": "output/lv3-audit-20261107/u16-source/general/patternsBody-raw.json",
                  "sha256": "795f9a9c56f7e6b9358cae5e10ddc0ec43bb0ab9f6f01d86d677824441ec7536"
                }
              ]
            }
          ],
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "examples",
    "path": "public/data/v1/examples.json",
    "key": "exampleId",
    "id": "EXb888b179",
    "before": {
      "exampleId": "EXb888b179",
      "word": "amaze",
      "sensePos": "v.",
      "meaningHint": "\u4f7f\u9a5a\u8a1d\uff08\u8003\u9ede\uff1aamaze sb by/with \u4ee4\u67d0\u4eba\u9a5a\u8a1d\uff09",
      "exampleType": "exam",
      "sentenceEn": "The little boy amazed the judges by naming every country on the map.",
      "sentenceZh": "\u90a3\u500b\u5c0f\u7537\u5b69\u8aaa\u51fa\u5730\u5716\u4e0a\u6bcf\u500b\u570b\u5bb6\u7684\u540d\u5b57\uff0c\u8b93\u8a55\u5be9\u5927\u70ba\u9a5a\u8a1d\u3002",
      "blankSentence": "The little boy _____ the judges by naming every country on the map.",
      "answer": "amazed",
      "difficulty": "LV3",
      "status": "draft"
    },
    "after": {
      "status": "reviewed"
    },
    "reason": "\u5c0f\u7537\u5b69\u8aaa\u51fa\u6240\u6709\u570b\u540d\u4f7f\u8a55\u5be9\u9a5a\u8a1d\uff1b\u4eba\u3001\u52d5\u4f5c\u3001by doing\u539f\u56e0\u8207\u4e2d\u8b6f\u4e00\u81f4\u3002 amazed \u70ba\u904e\u53bb\u5f0f\u52d5\u8a5e\uff0cjudges\u70ba\u53d7\u8a5e\uff0cby naming\u70ba\u65b9\u5f0f\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/amaze"
    ],
    "fieldEvidence": {
      "status": [
        {
          "proposal": "U16-STATUS-REVIEW-EXAMPLES-EXb888b179-STATUS",
          "originFindingIds": [
            "U16-STATUS-REVIEW-EXAMPLES-EXb888b179-STATUS"
          ],
          "reason": "\u5c0f\u7537\u5b69\u8aaa\u51fa\u6240\u6709\u570b\u540d\u4f7f\u8a55\u5be9\u9a5a\u8a1d\uff1b\u4eba\u3001\u52d5\u4f5c\u3001by doing\u539f\u56e0\u8207\u4e2d\u8b6f\u4e00\u81f4\u3002 amazed \u70ba\u904e\u53bb\u5f0f\u52d5\u8a5e\uff0cjudges\u70ba\u53d7\u8a5e\uff0cby naming\u70ba\u65b9\u5f0f\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
          "sources": [
            {
              "url": "https://www.collinsdictionary.com/dictionary/english/amaze",
              "claim": "\u5c0f\u7537\u5b69\u8aaa\u51fa\u6240\u6709\u570b\u540d\u4f7f\u8a55\u5be9\u9a5a\u8a1d\uff1b\u4eba\u3001\u52d5\u4f5c\u3001by doing\u539f\u56e0\u8207\u4e2d\u8b6f\u4e00\u81f4\u3002",
              "verification": "direct_dictionary_body_read",
              "readDate": "2026-11-09",
              "artifacts": [
                {
                  "artifact": "output/lv3-audit-20261107/u16-source/general/formsA-raw.json",
                  "sha256": "116a9913d12b3e83cb35ff1af64d17d4917bdf59aa047dbadfcf6da9e8dcf99a"
                }
              ]
            }
          ],
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "examples",
    "path": "public/data/v1/examples.json",
    "key": "exampleId",
    "id": "EXbfadd806",
    "before": {
      "exampleId": "EXbfadd806",
      "word": "sculpture",
      "sensePos": "n.",
      "meaningHint": "\u96d5\u5851\u4f5c\u54c1\uff08\u8003\u9ede\uff1a\u85dd\u8853\u54c1\uff09",
      "exampleType": "exam",
      "sentenceEn": "The garden is full of stone sculptures made by local artists.",
      "sentenceZh": "\u9019\u5ea7\u82b1\u5712\u88e1\u6eff\u662f\u7576\u5730\u85dd\u8853\u5bb6\u505a\u7684\u77f3\u96d5\u3002",
      "blankSentence": "The garden is full of stone _____ made by local artists.",
      "answer": "sculptures",
      "difficulty": "LV4",
      "status": "draft"
    },
    "after": {
      "status": "reviewed"
    },
    "reason": "\u7576\u5730\u85dd\u8853\u5bb6\u88fd\u4f5c\u82b1\u5712\u77f3\u96d5\uff1b\u540d\u8a5e\u4f5c\u54c1\u7fa9\u3001\u4e2d\u8b6f\u4e00\u81f4\u3002 sculptures\u70ba\u8907\u6578\u53ef\u6578\u540d\u8a5e\uff0cstone\u4fee\u98fe\u6750\u6599\u3001made by\u70ba\u5206\u8a5e\u7247\u8a9e\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/sculpture"
    ],
    "fieldEvidence": {
      "status": [
        {
          "proposal": "U16-STATUS-REVIEW-EXAMPLES-EXbfadd806-STATUS",
          "originFindingIds": [
            "U16-STATUS-REVIEW-EXAMPLES-EXbfadd806-STATUS"
          ],
          "reason": "\u7576\u5730\u85dd\u8853\u5bb6\u88fd\u4f5c\u82b1\u5712\u77f3\u96d5\uff1b\u540d\u8a5e\u4f5c\u54c1\u7fa9\u3001\u4e2d\u8b6f\u4e00\u81f4\u3002 sculptures\u70ba\u8907\u6578\u53ef\u6578\u540d\u8a5e\uff0cstone\u4fee\u98fe\u6750\u6599\u3001made by\u70ba\u5206\u8a5e\u7247\u8a9e\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
          "sources": [
            {
              "url": "https://www.collinsdictionary.com/dictionary/english/sculpture",
              "claim": "\u7576\u5730\u85dd\u8853\u5bb6\u88fd\u4f5c\u82b1\u5712\u77f3\u96d5\uff1b\u540d\u8a5e\u4f5c\u54c1\u7fa9\u3001\u4e2d\u8b6f\u4e00\u81f4\u3002",
              "verification": "direct_dictionary_body_read",
              "readDate": "2026-11-09",
              "artifacts": [
                {
                  "artifact": "output/lv3-audit-20261107/u16-source/general/formsBfind2-raw.json",
                  "sha256": "c9069e85b8a96f1a7d27e5ab4ce41aae3756ac603afb950d608f3e69d8c5639f"
                }
              ]
            }
          ],
          "beforePresent": true
        }
      ]
    }
  },
  {
    "dataset": "examples",
    "path": "public/data/v1/examples.json",
    "key": "exampleId",
    "id": "EXdec71249",
    "before": {
      "exampleId": "EXdec71249",
      "word": "beam",
      "sensePos": "n.",
      "meaningHint": "\u5149\u675f\uff08\u8003\u9ede\uff1aa beam of light\uff09",
      "exampleType": "exam",
      "sentenceEn": "A beam of sunlight came through the crack in the curtains.",
      "sentenceZh": "\u4e00\u9053\u967d\u5149\u5f9e\u7a97\u7c3e\u7684\u7e2b\u9699\u7167\u9032\u4f86\u3002",
      "blankSentence": "A _____ of sunlight came through the crack in the curtains.",
      "answer": "beam",
      "difficulty": "LV3",
      "status": "draft"
    },
    "after": {
      "status": "reviewed"
    },
    "reason": "\u967d\u5149\u7a7f\u904e\u7a97\u7c3e\u7e2b\u9699\uff1b\u5149\u675f\u7fa9\u3001\u4e2d\u8b6f\u4e00\u81f4\u3002 beam \u5728 A\u8207of sunlight\u4e4b\u9593\u70ba\u55ae\u6578\u53ef\u6578\u540d\u8a5e\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
    "evidence": [
      "https://www.collinsdictionary.com/dictionary/english/beam"
    ],
    "fieldEvidence": {
      "status": [
        {
          "proposal": "U16-STATUS-REVIEW-EXAMPLES-EXdec71249-STATUS",
          "originFindingIds": [
            "U16-STATUS-REVIEW-EXAMPLES-EXdec71249-STATUS"
          ],
          "reason": "\u967d\u5149\u7a7f\u904e\u7a97\u7c3e\u7e2b\u9699\uff1b\u5149\u675f\u7fa9\u3001\u4e2d\u8b6f\u4e00\u81f4\u3002 beam \u5728 A\u8207of sunlight\u4e4b\u9593\u70ba\u55ae\u6578\u53ef\u6578\u540d\u8a5e\u3002 \u6b64\u8655\u50c5\u4ee3\u7406\u8a9e\u8a00\u6838\u5c0d\uff0c\u4e0d\u8868\u793a\u5b98\u65b9\u539f\u984c\u8a8d\u8b49\u3001\u5716\u7247\u5be9\u6838\u6216\u4f7f\u7528\u8005\u9a57\u6536\u3002",
          "sources": [
            {
              "url": "https://www.collinsdictionary.com/dictionary/english/beam",
              "claim": "\u967d\u5149\u7a7f\u904e\u7a97\u7c3e\u7e2b\u9699\uff1b\u5149\u675f\u7fa9\u3001\u4e2d\u8b6f\u4e00\u81f4\u3002",
              "verification": "direct_dictionary_body_read",
              "readDate": "2026-11-09",
              "artifacts": [
                {
                  "artifact": "output/lv3-audit-20261107/u16-source/general/formsAfind-raw.json",
                  "sha256": "de420c8098c34e093cff5ab8af52e67408c8de72d3f4fb888e4e65b08b589f80"
                }
              ]
            }
          ],
          "beforePresent": true
        }
      ]
    }
  }
]''')
RESERVED = frozenset((p['dataset'], p['id']) for p in EXPECTED)
def verified(manifest, patch):
    return (manifest.get('unit') == 'LV3-U16' and any(
        json.dumps(patch, sort_keys=True, ensure_ascii=False) == json.dumps(p, sort_keys=True, ensure_ascii=False)
        for p in EXPECTED))
