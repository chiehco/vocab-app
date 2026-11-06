"""Apply a small, evidence-backed content audit without reimporting the master.

The manifest is explicit about row identity, old values, new values and evidence.
Every row is validated before any write. Original rows and hashes are retained in
output/unit-audit-20261105/receipts; Git can restore the original public snapshot.
"""
from __future__ import annotations
import argparse
import copy
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from build_sa_pack import build_sa_pack

ROOT = Path(__file__).resolve().parent.parent
IDENTITY_KEYS = {"examples": "exampleId", "senses": "senseId", "words": "wordId", "notes": "noteId"}
EDITABLE_FIELDS = {"sensePos", "meaningHint", "status", "meaningZh", "meaningEn", "note", "senseId", "usagePattern", "usagePatternZh", "examEvidence"}
FORM_IDS = set('W000044 W000086 W000102 W000107 W000130 W000133 W000175 W000205 W000209 W000248 W000287 W000311 W000322 W000353 W000374 W000383 W000453 W000460 W000473 W000502 W000517 W000518 W000610 W000646 W000704 W000750 W000764 W000794 W000828 W000842 W000947'.split())
FOLLOWUP_FORM_IDS = set('W000113 W000155 W000183 W000184 W000343 W000363 W000507 W000633 W000650 W000695 W000740 W000823 W000851 W000858 W000894 W000995'.split())
U16_FORM_IDS = set('W000367 W000170 W000891 W000448 W000140 W000380 W000745 W000892 W000729 W000098 W000660 W000737 W000545 W000463 W000940 W000926 W001437 W002486 W000739 W000653 W003767 W004820 W000522 W001012 W001825'.split())
U17_FORM_IDS = set('W000194 W000992 W000173 W000189 W000752 W000179 W000751 W000515 W000261 W000796 W000109 W000123 W000111 W004656 W001655 W001910 W000643 W000675'.split())
U18_FORM_IDS = set('W000793 W000230 W000227 W000728 W000773 W000315 W000452 W000795 W000229 W000520 W000445 W000421 W000246 W000094 W000118 W000511 W001953 W001078 W002271 W000492'.split())
U19_FORM_IDS = set('W000596 W000959 W000457 W000065 W000817 W000317 W001490 W005402 W002162 W000690 W005089 W005416 W003399'.split())
U20_FORM_IDS = set('W000136 W000294 W000638 W000241 W000124 W000868 W000357 W000990 W000956 W000306 W004853 W001997 W001107 W003048 W001057'.split())
U21_FORM_IDS = set('W000815 W000958 W000929 W000264 W001992 W004194 W003357 W001844 W001285'.split())
INTEGRATED_U05_U06_FORM_IDS = set('W000348 W000309 W000270 W000933 W000493 W000881 W000618 W000500 W000986 W000870 W000256 W000242 W000074 W000864 W000049 W000055 W000772 W000480 W000741 W000199 W000968 W000628 W000262 W000824 W000080 W000302 W000595 W000319 W000924 W000688 W000403 W000450 W000685 W000121 W000365 W000147 W000661 W000494 W000486 W000922 W000950 W001054 W005996 W000559 W001723'.split())
INTEGRATED_U07_FORM_IDS = set('W000008 W000041 W000046 W000082 W000146 W000387 W000432 W000476 W000498 W000525 W000529 W000534 W000541 W000569 W000613 W000632 W000672 W000699 W000724 W000732 W000755 W000784 W000822 W000920 W001086 W001523 W001598 W001768 W001779 W002047 W003270 W003306 W003352 W003553 W003959 W004780'.split())
INTEGRATED_U08_U09_FORM_IDS = set('W000635 W000655 W003289 W000630 W000366 W000011 W000376 W001594 W000976 W000504 W000016 W001390 W000572 W000224 W001045 W003329 W000478 W000169 W003154 W000204 W001708 W001932 W000125 W000291 W002227 W000718 W001456 W000328 W000677 W000707 W000364 W000326 W000316 W000207 W002711 W001184 W001307 W002292 W000117 W000467 W004786 W004804 W003584 W000239 W000622 W000945 W000266 W001331 W000219'.split())
INTEGRATED_U10_FORM_IDS = set('W000023 W002636 W003416 W003020 W000698 W001517 W002983 W000171 W000201 W004944 W001261 W001454 W002734 W000645 W000307 W000709 W000243 W001159 W000313 W000826 W000814 W000949 W003672 W000748 W000895 W000700'.split())
INTEGRATED_U11_FORM_IDS = set('W000409 W000980 W000591 W001854 W000018 W001259 W000156 W000889 W005939 W000305 W000711 W000955 W003188 W000497 W000444 W000730 W000701 W000310 W000454 W000674 W000908 W000785 W000819 W000110 W000670'.split())
INTEGRATED_U12_FORM_IDS = set('W000035 W001726 W001729 W000389 W000916 W000683 W000296 W000684 W001528 W000312 W002996 W001566 W004689 W001291 W000216 W000673 W000919 W000212 W000662 W000405 W001919 W001927 W002461 W004866 W000852 W000651 W000694 W000665'.split())
INTEGRATED_U13_FORM_IDS = set('W000715 W000393 W002042 W000829 W000401 W001376 W001188 W000767 W000910 W000790 W004016 W000143 W000693 W000301 W000084 W000097 W000627 W002229 W000951'.split())
INTEGRATED_U14_FORM_IDS = set('W000503 W000911 W000544 W000058 W000558 W000119 W000776 W000722 W000061 W000341 W000604 W000318 W000159 W001326 W000989 W000723 W005813 W000138'.split())
INTEGRATED_U15_FORM_IDS = set('W000625 W000593 W000069 W000451 W004579 W000846 W001788 W000197 W000361 W005517 W000461 W000771 W005090 W000948 W000191 W000247 W000855 W001125 W000962 W002330 W000284 W000780'.split())
U22_FORM_IDS = set('W000149 W000915 W000167 W004858 W000196 W000788 W000165 W000641 W001771 W001521 W001450 W000818 W000089 W001081 W003261 W000917 W000860'.split())
U23_FORM_IDS = set('W000157 W004048 W000938 W001711 W000680 W000619 W002616 W000435 W000470 W001197 W002720 W004199 W000240 W005329 W000321 W001931 W004266 W000106 W001501 W000542 W000837 W000512 W000462'.split())
U25_FORM_IDS = set('W000437 W000760 W000629 W000281 W000797 W000150 W000132 W000192 W000285 W000182 W000912 W000521 W000290 W000178 W002053 W000221 W000282 W000647 W000708 W000245 W000051 W000777 W000096 W000649'.split())
LV2_U27_FORM_IDS = set('W001666 W001407 W001896 W001732 W001926 W001966 W001199 W001508 W001678 W001055 W001243 W001180 W001591 W001106 W005755 W001134 W004130 W004361 W003620 W004280'.split())
LV2_U27_NOTE_IDS = set('NXa9825fa6 NXba46cf7b NXd54e07b2 NXa83db220 NX2c6cb1d6 NXd8aa860b NXde82b413 NX3d756fb4'.split())
LV2_U28_FORM_IDS = set('W001253 W001005 W001714 W001718 W001239 W001841 W001043 W001209 W001100 W001144 W001151 W001463 W004365 W004139 W001958 W002278 W005823'.split())
LV2_U28_NOTE_IDS = set('NX62b7cbda NX2b7e8109 NXd8cde86b'.split())
U24_FORM_IDS = set('W002174 W000943 W001102 W000575 W001581 W000657 W000642'.split())
U23_TRANSLATION_IDS = {'EXff6b330f', 'EXf7d6aec6', 'EXe50e7d1f'}
U22_TRANSLATION_IDS = {'EX93dc7fe9'}
U18_TRANSLATION_IDS = {'EX0f888c6a', 'EXf0dab820'}
TRANSLATION_IDS = {'EX50693488', 'EXddc4d110', 'EX66703666', 'EX1f033d08', 'EX51e703b4', 'EXd51bd96d', 'EX4c5b9769', 'EX299bccf8', 'EX2ff9ba41'}
ABSENT = {"$absent": True}

def validate_patch_shape(patch):
    """Reject incomplete evidence before the idempotent check or any write."""
    assert patch["dataset"] in IDENTITY_KEYS
    assert patch["key"] == IDENTITY_KEYS[patch["dataset"]], "Unexpected row identity field"
    assert patch.get("reason") and patch.get("evidence")
    assert isinstance(patch.get("before"), dict) and isinstance(patch.get("after"), dict)
    assert patch["after"], "Empty correction"
    allowed = EDITABLE_FIELDS | {'verbForms', 'sentenceZh', 'content'}
    if patch["dataset"] == "notes" and patch["id"] in {"NXa9825fa6", "NX2b7e8109", "NXd8cde86b"}:
        allowed |= {"title"}
    assert set(patch["after"]) <= allowed, "Unlisted editable field"
    assert set(patch["after"]) <= set(patch["before"]), "Every after field needs an explicit before value"
    assert patch["key"] not in patch["after"], "Row identity cannot change"
    if "examEvidence" in patch["after"]:
        assert patch["dataset"] == "senses", "Exam-source evidence belongs to the sense row"
    if patch['dataset'] == 'notes' or 'content' in patch['after']:
        if patch['id'] in LV2_U28_NOTE_IDS:
            facts = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-LV2-U28-NOTE-SOURCES.json')['facts']
            assert len(facts) == 3 and {f['noteId'] for f in facts} == LV2_U28_NOTE_IDS
            fact = next(f for f in facts if f['noteId'] == patch['id'])
            assert patch['dataset'] == 'notes' and patch['before'] == fact['before'] and patch['after'] == fact['after'], 'Exact LV2 U28 full-note source guards required'
            expected = {'title'} if patch['id'] == 'NX2b7e8109' else {'title', 'content'} if patch['id'] == 'NXd8cde86b' else {'content'}
            assert set(patch['after']) == expected, 'Only two exact U28 titles may change'
            return
        if patch['id'] in LV2_U27_NOTE_IDS:
            facts = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-LV2-U27-NOTE-SOURCES.json')['facts']
            assert len(facts) == 8 and {f['noteId'] for f in facts} == LV2_U27_NOTE_IDS
            fact = next(f for f in facts if f['noteId'] == patch['id'])
            assert patch['dataset'] == 'notes' and patch['before'] == fact['before'] and patch['after'] == fact['after'], 'Exact LV2 U27 note and source guards required'
            assert set(patch['after']) == ({'title'} if patch['id'] == 'NXa9825fa6' else {'content'}), 'Title editable only for the individually verified term note'
            return
        if patch['id'] == 'NXe49d83a6':
            facts = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-U24-NOTE-SOURCES.json')['facts']
            assert len(facts) == 1 and facts[0]['noteId'] == 'NXe49d83a6'
            fact = facts[0]
            assert patch['dataset'] == 'notes' and patch['before'] == fact['before'] and patch['after'] == fact['after'], 'Exact U24 note row and content required'
            assert set(patch['after']) == {'content'} and fact['after']['content'] == '輪胎洩氣。'
            return
        assert patch['dataset'] == 'notes' and patch['id'] == 'NXc62b0f26', 'Only the individually verified existing note content may change'
        facts = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-NOTE-SOURCES.json')['facts']
        assert len(facts) == 1 and facts[0]['noteId'] == 'NXc62b0f26'
        fact = facts[0]
        assert patch['before'] == fact['before'] and patch['after'] == fact['after'], 'Exact note content, word, title, type and status guards required'
        assert set(patch['after']) == {'content'}, 'No note identity, title, type or status change'
        assert fact['after']['content'] == fact['before']['content'].replace('腦部創傷','頭部傷勢'), 'Only the verified duplicate translation is editable'
    if 'verbForms' in patch['after'] and patch['id'] in LV2_U28_FORM_IDS:
        facts = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-LV2-U28-VERB-FORMS-SOURCES.json')['facts']
        assert len(facts) == 17 and {f['wordId'] for f in facts} == LV2_U28_FORM_IDS
        assert patch['dataset'] == 'words' and patch['before'] == {'verbForms': ABSENT} and set(patch['after']) == {'verbForms'}
        fact = next(f for f in facts if f['wordId'] == patch['id'])
        assert patch['after']['verbForms'] == fact['verbForms'], 'Exact U28 forms and source required'
        return
    if 'verbForms' in patch['after']:
        assert patch['dataset'] == 'words' and patch['id'] in FORM_IDS | FOLLOWUP_FORM_IDS | U16_FORM_IDS | U17_FORM_IDS | U18_FORM_IDS | U19_FORM_IDS | U20_FORM_IDS | U21_FORM_IDS | INTEGRATED_U05_U06_FORM_IDS | INTEGRATED_U07_FORM_IDS | INTEGRATED_U08_U09_FORM_IDS | INTEGRATED_U10_FORM_IDS | INTEGRATED_U11_FORM_IDS | INTEGRATED_U12_FORM_IDS | INTEGRATED_U13_FORM_IDS | INTEGRATED_U14_FORM_IDS | INTEGRATED_U15_FORM_IDS | U22_FORM_IDS | U23_FORM_IDS | U24_FORM_IDS | U25_FORM_IDS | LV2_U27_FORM_IDS, 'Only individually verified existing verbs may acquire principal parts'
        assert patch['before'] == {'verbForms': ABSENT} and set(patch['after']) == {'verbForms'}, 'Only an explicitly absent verbForms field may be added'
        facts = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-VERB-FORMS-SOURCES.json')['facts']
        assert len(facts) == 31 and {f['wordId'] for f in facts} == FORM_IDS
        followups = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-FOLLOWUP-VERB-FORMS-SOURCES.json')['facts']
        assert len(followups) == len(FOLLOWUP_FORM_IDS) and {f['wordId'] for f in followups} == FOLLOWUP_FORM_IDS
        assert not FORM_IDS & FOLLOWUP_FORM_IDS, 'Preserve the original 31 source facts independently'
        u16 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-U16-VERB-FORMS-SOURCES.json')['facts']
        assert len(u16) == 25 and {f['wordId'] for f in u16} == U16_FORM_IDS
        assert not (FORM_IDS | FOLLOWUP_FORM_IDS) & U16_FORM_IDS, 'Keep the separately verified U16 scope disjoint'
        u17 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-U17-VERB-FORMS-SOURCES.json')['facts']
        assert len(u17) == 18 and {f['wordId'] for f in u17} == U17_FORM_IDS
        assert not (FORM_IDS | FOLLOWUP_FORM_IDS | U16_FORM_IDS) & U17_FORM_IDS, 'Keep the exact U17 source scope separate'
        u18 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-U18-VERB-FORMS-SOURCES.json')['facts']
        assert len(u18) == 20 and {f['wordId'] for f in u18} == U18_FORM_IDS
        assert not (FORM_IDS | FOLLOWUP_FORM_IDS | U16_FORM_IDS | U17_FORM_IDS) & U18_FORM_IDS, 'Keep the exact U18 source scope separate'
        u19 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-U19-VERB-FORMS-SOURCES.json')['facts']
        assert len(u19) == 13 and {f['wordId'] for f in u19} == U19_FORM_IDS
        assert not (FORM_IDS | FOLLOWUP_FORM_IDS | U16_FORM_IDS | U17_FORM_IDS | U18_FORM_IDS) & U19_FORM_IDS, 'Keep the exact U19 source scope separate'
        u20 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-U20-VERB-FORMS-SOURCES.json')['facts']
        assert len(u20) == 15 and {f['wordId'] for f in u20} == U20_FORM_IDS
        assert not (FORM_IDS | FOLLOWUP_FORM_IDS | U16_FORM_IDS | U17_FORM_IDS | U18_FORM_IDS | U19_FORM_IDS) & U20_FORM_IDS, 'Keep the exact U20 source scope separate'
        u21 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-U21-VERB-FORMS-SOURCES.json')['facts']
        assert len(u21) == 9 and {f['wordId'] for f in u21} == U21_FORM_IDS
        assert not (FORM_IDS | FOLLOWUP_FORM_IDS | U16_FORM_IDS | U17_FORM_IDS | U18_FORM_IDS | U19_FORM_IDS | U20_FORM_IDS) & U21_FORM_IDS, 'Keep the exact U21 source scope separate'
        integrated_u05_u06 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-INTEGRATED-U05-U06-VERB-FORMS-SOURCES.json')['facts']
        assert len(integrated_u05_u06) == 45 and {f['wordId'] for f in integrated_u05_u06} == INTEGRATED_U05_U06_FORM_IDS
        assert not (FORM_IDS | FOLLOWUP_FORM_IDS | U16_FORM_IDS | U17_FORM_IDS | U18_FORM_IDS | U19_FORM_IDS | U20_FORM_IDS | U21_FORM_IDS) & INTEGRATED_U05_U06_FORM_IDS, 'Integrated U05-U06 scope must remain exact and separate'
        integrated_u07 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-INTEGRATED-U07-VERB-FORMS-SOURCES.json')['facts']
        assert len(integrated_u07) == 36 and {f['wordId'] for f in integrated_u07} == INTEGRATED_U07_FORM_IDS
        assert not (FORM_IDS | FOLLOWUP_FORM_IDS | U16_FORM_IDS | U17_FORM_IDS | U18_FORM_IDS | U19_FORM_IDS | U20_FORM_IDS | U21_FORM_IDS | INTEGRATED_U05_U06_FORM_IDS) & INTEGRATED_U07_FORM_IDS, 'Integrated U07 scope must remain exact and separate'
        integrated_u08_u09 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-INTEGRATED-U08-U09-VERB-FORMS-SOURCES.json')['facts']
        assert len(integrated_u08_u09) == 49 and {f['wordId'] for f in integrated_u08_u09} == INTEGRATED_U08_U09_FORM_IDS
        assert not (FORM_IDS | FOLLOWUP_FORM_IDS | U16_FORM_IDS | U17_FORM_IDS | U18_FORM_IDS | U19_FORM_IDS | U20_FORM_IDS | U21_FORM_IDS | INTEGRATED_U05_U06_FORM_IDS | INTEGRATED_U07_FORM_IDS) & INTEGRATED_U08_U09_FORM_IDS, 'Integrated U08-U09 scope must remain exact and separate'
        integrated_u10 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-INTEGRATED-U10-VERB-FORMS-SOURCES.json')['facts']
        assert len(integrated_u10) == 26 and {f['wordId'] for f in integrated_u10} == INTEGRATED_U10_FORM_IDS
        assert not (FORM_IDS | FOLLOWUP_FORM_IDS | U16_FORM_IDS | U17_FORM_IDS | U18_FORM_IDS | U19_FORM_IDS | U20_FORM_IDS | U21_FORM_IDS | INTEGRATED_U05_U06_FORM_IDS | INTEGRATED_U07_FORM_IDS | INTEGRATED_U08_U09_FORM_IDS) & INTEGRATED_U10_FORM_IDS, 'Integrated U10 scope must remain exact and separate'
        integrated_u11 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-INTEGRATED-U11-VERB-FORMS-SOURCES.json')['facts']
        assert len(integrated_u11) == 25 and {f['wordId'] for f in integrated_u11} == INTEGRATED_U11_FORM_IDS
        assert not (FORM_IDS | FOLLOWUP_FORM_IDS | U16_FORM_IDS | U17_FORM_IDS | U18_FORM_IDS | U19_FORM_IDS | U20_FORM_IDS | U21_FORM_IDS | INTEGRATED_U05_U06_FORM_IDS | INTEGRATED_U07_FORM_IDS | INTEGRATED_U08_U09_FORM_IDS | INTEGRATED_U10_FORM_IDS) & INTEGRATED_U11_FORM_IDS, 'Integrated U11 scope must remain exact and separate'
        integrated_u12 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-INTEGRATED-U12-VERB-FORMS-SOURCES.json')['facts']
        assert len(integrated_u12) == 28 and {f['wordId'] for f in integrated_u12} == INTEGRATED_U12_FORM_IDS
        assert not (FORM_IDS | FOLLOWUP_FORM_IDS | U16_FORM_IDS | U17_FORM_IDS | U18_FORM_IDS | U19_FORM_IDS | U20_FORM_IDS | U21_FORM_IDS | INTEGRATED_U05_U06_FORM_IDS | INTEGRATED_U07_FORM_IDS | INTEGRATED_U08_U09_FORM_IDS | INTEGRATED_U10_FORM_IDS | INTEGRATED_U11_FORM_IDS) & INTEGRATED_U12_FORM_IDS, 'Integrated U12 scope must remain exact and separate'
        integrated_u13 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-INTEGRATED-U13-VERB-FORMS-SOURCES.json')['facts']
        assert len(integrated_u13) == 19 and {f['wordId'] for f in integrated_u13} == INTEGRATED_U13_FORM_IDS
        assert not (FORM_IDS | FOLLOWUP_FORM_IDS | U16_FORM_IDS | U17_FORM_IDS | U18_FORM_IDS | U19_FORM_IDS | U20_FORM_IDS | U21_FORM_IDS | INTEGRATED_U05_U06_FORM_IDS | INTEGRATED_U07_FORM_IDS | INTEGRATED_U08_U09_FORM_IDS | INTEGRATED_U10_FORM_IDS | INTEGRATED_U11_FORM_IDS | INTEGRATED_U12_FORM_IDS) & INTEGRATED_U13_FORM_IDS, 'Integrated U13 scope must remain exact and separate'
        integrated_u14 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-INTEGRATED-U14-VERB-FORMS-SOURCES.json')['facts']
        assert len(integrated_u14) == 18 and {f['wordId'] for f in integrated_u14} == INTEGRATED_U14_FORM_IDS
        assert not (FORM_IDS | FOLLOWUP_FORM_IDS | U16_FORM_IDS | U17_FORM_IDS | U18_FORM_IDS | U19_FORM_IDS | U20_FORM_IDS | U21_FORM_IDS | INTEGRATED_U05_U06_FORM_IDS | INTEGRATED_U07_FORM_IDS | INTEGRATED_U08_U09_FORM_IDS | INTEGRATED_U10_FORM_IDS | INTEGRATED_U11_FORM_IDS | INTEGRATED_U12_FORM_IDS | INTEGRATED_U13_FORM_IDS) & INTEGRATED_U14_FORM_IDS, 'Integrated U14 scope must remain exact and separate'
        integrated_u15 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-INTEGRATED-U15-VERB-FORMS-SOURCES.json')['facts']
        assert len(integrated_u15) == 22 and {f['wordId'] for f in integrated_u15} == INTEGRATED_U15_FORM_IDS
        assert not (FORM_IDS | FOLLOWUP_FORM_IDS | U16_FORM_IDS | U17_FORM_IDS | U18_FORM_IDS | U19_FORM_IDS | U20_FORM_IDS | U21_FORM_IDS | INTEGRATED_U05_U06_FORM_IDS | INTEGRATED_U07_FORM_IDS | INTEGRATED_U08_U09_FORM_IDS | INTEGRATED_U10_FORM_IDS | INTEGRATED_U11_FORM_IDS | INTEGRATED_U12_FORM_IDS | INTEGRATED_U13_FORM_IDS | INTEGRATED_U14_FORM_IDS) & INTEGRATED_U15_FORM_IDS, 'Integrated U15 scope must remain exact and separate'
        u22 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-U22-VERB-FORMS-SOURCES.json')['facts']
        assert len(u22) == 17 and {f['wordId'] for f in u22} == U22_FORM_IDS
        earlier_ids = FORM_IDS | FOLLOWUP_FORM_IDS | U16_FORM_IDS | U17_FORM_IDS | U18_FORM_IDS | U19_FORM_IDS | U20_FORM_IDS | U21_FORM_IDS | INTEGRATED_U05_U06_FORM_IDS | INTEGRATED_U07_FORM_IDS | INTEGRATED_U08_U09_FORM_IDS | INTEGRATED_U10_FORM_IDS | INTEGRATED_U11_FORM_IDS | INTEGRATED_U12_FORM_IDS | INTEGRATED_U13_FORM_IDS | INTEGRATED_U14_FORM_IDS | INTEGRATED_U15_FORM_IDS
        assert not earlier_ids & U22_FORM_IDS, 'Keep the exact sourced U22 scope separate'
        u23 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-U23-VERB-FORMS-SOURCES.json')['facts']
        assert len(u23) == 23 and {f['wordId'] for f in u23} == U23_FORM_IDS
        assert not (earlier_ids | U22_FORM_IDS) & U23_FORM_IDS, 'Keep the exact sourced U23 scope separate'
        u24 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-U24-VERB-FORMS-SOURCES.json')['facts']
        assert len(u24) == 7 and {f['wordId'] for f in u24} == U24_FORM_IDS
        assert not (earlier_ids | U22_FORM_IDS | U23_FORM_IDS) & U24_FORM_IDS, 'Keep the exact sourced U24 scope separate'
        u25 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-U25-VERB-FORMS-SOURCES.json')['facts']
        assert len(u25) == 24 and {f['wordId'] for f in u25} == U25_FORM_IDS
        assert not (earlier_ids | U22_FORM_IDS | U23_FORM_IDS | U24_FORM_IDS) & U25_FORM_IDS, 'Keep the exact sourced U25 scope separate'
        lv2_u27 = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-LV2-U27-VERB-FORMS-SOURCES.json')['facts']
        assert len(lv2_u27) == 20 and {f['wordId'] for f in lv2_u27} == LV2_U27_FORM_IDS
        assert not (earlier_ids | U22_FORM_IDS | U23_FORM_IDS | U24_FORM_IDS | U25_FORM_IDS) & LV2_U27_FORM_IDS
        facts += lv2_u27
        facts += u25
        facts += u24
        facts += u23
        facts += u22
        facts += followups + u16 + u17 + u18 + u19 + u20 + u21 + integrated_u05_u06 + integrated_u07 + integrated_u08_u09 + integrated_u10 + integrated_u11 + integrated_u12 + integrated_u13 + integrated_u14 + integrated_u15
        fact = next(f for f in facts if f['wordId'] == patch['id'])
        assert patch['after']['verbForms'] == fact['verbForms'], 'Unverified principal parts or source'
    if 'sentenceZh' in patch['after']:
        if patch['id'] in U23_TRANSLATION_IDS:
            facts = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-U23-TRANSLATION-SOURCES.json')['facts']
            assert patch['dataset'] == 'examples' and len(facts) == 3 and {f['exampleId'] for f in facts} == U23_TRANSLATION_IDS
            fact = next(f for f in facts if f['exampleId'] == patch['id'])
            assert patch['before'] == fact['before'] and patch['after'] == fact['after'], 'Exact U23 headword, English, blank, answer and Chinese guards required'
            assert set(patch['after']) == {'sentenceZh'}
            return
        if patch['id'] in U22_TRANSLATION_IDS:
            facts = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-U22-TRANSLATION-SOURCES.json')['facts']
            assert patch['dataset'] == 'examples' and len(facts) == 1 and {f['exampleId'] for f in facts} == U22_TRANSLATION_IDS
            fact = facts[0]
            assert patch['before'] == fact['before'] and patch['after'] == fact['after'], 'Exact U22 headword, English, blank, answer and Chinese guards required'
            assert set(patch['after']) == {'sentenceZh'}
            return
        assert patch['dataset'] == 'examples' and patch['id'] in TRANSLATION_IDS | U18_TRANSLATION_IDS, 'Only individually verified Chinese translations are editable'
        assert set(patch['before']) == {'sentenceEn', 'sentenceZh'} and set(patch['after']) == {'sentenceZh'}, 'Exact unchanged English guard required'
        facts = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-TRANSLATION-SOURCES.json')['facts']
        assert len(facts) == 9 and {f['exampleId'] for f in facts} == TRANSLATION_IDS
        u18_translations = read(ROOT / 'docs/unit-audit-20261105/VERIFIED-U18-TRANSLATION-SOURCES.json')['facts']
        assert len(u18_translations) == 2 and {f['exampleId'] for f in u18_translations} == U18_TRANSLATION_IDS
        assert not TRANSLATION_IDS & U18_TRANSLATION_IDS
        facts += u18_translations
        fact = next(f for f in facts if f['exampleId'] == patch['id'])
        assert patch['before'] == {'sentenceEn': fact['sentenceEn'], 'sentenceZh': fact['before']} and patch['after'] == {'sentenceZh': fact['after']}, 'Unverified translation or English guard'

def apply_to_row(row, patch):
    """Validate guards even for idempotent rows; missing optional keys stay distinct from null."""
    if 'verbForms' in patch['after']:
        assert row['word'] == patch['after']['verbForms']['base'] and 'v.' in row['pos'], 'Forms belong only to this existing verb'
        if patch['id'] in LV2_U28_FORM_IDS:
            fact = next(f for f in read(ROOT / 'docs/unit-audit-20261105/VERIFIED-LV2-U28-VERB-FORMS-SOURCES.json')['facts'] if f['wordId'] == patch['id'])
            non_form = {k: v for k, v in row.items() if k != 'verbForms'}
            digest = hashlib.sha256(json.dumps(non_form, ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()
            assert digest == fact['nonFormRowSha256'], 'Exact LV2 U28 non-form row guard changed'
        if patch['id'] in LV2_U27_FORM_IDS:
            fact = next(f for f in read(ROOT / 'docs/unit-audit-20261105/VERIFIED-LV2-U27-VERB-FORMS-SOURCES.json')['facts'] if f['wordId'] == patch['id'])
            non_form = {k: v for k, v in row.items() if k != 'verbForms'}
            digest = hashlib.sha256(json.dumps(non_form, ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()
            assert digest == fact['nonFormRowSha256'], 'Exact LV2 U27 non-form row guard changed'
        if patch['id'] in U25_FORM_IDS:
            fact = next(f for f in read(ROOT / 'docs/unit-audit-20261105/VERIFIED-U25-VERB-FORMS-SOURCES.json')['facts'] if f['wordId'] == patch['id'])
            non_form = {k: v for k, v in row.items() if k != 'verbForms'}
            digest = hashlib.sha256(json.dumps(non_form, ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()
            assert digest == fact['nonFormRowSha256'], 'Exact U25 non-form row guard changed'
        if patch['id'] in U24_FORM_IDS:
            fact = next(f for f in read(ROOT / 'docs/unit-audit-20261105/VERIFIED-U24-VERB-FORMS-SOURCES.json')['facts'] if f['wordId'] == patch['id'])
            non_form = {k: v for k, v in row.items() if k != 'verbForms'}
            digest = hashlib.sha256(json.dumps(non_form, ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()
            assert digest == fact['nonFormRowSha256'], 'Exact U24 non-form row guard changed'
        if patch['id'] in U23_FORM_IDS:
            fact = next(f for f in read(ROOT / 'docs/unit-audit-20261105/VERIFIED-U23-VERB-FORMS-SOURCES.json')['facts'] if f['wordId'] == patch['id'])
            non_form = {k: v for k, v in row.items() if k != 'verbForms'}
            digest = hashlib.sha256(json.dumps(non_form, ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()
            assert digest == fact['nonFormRowSha256'], 'Exact U23 non-form row guard changed'
        if patch['id'] in U22_FORM_IDS:
            fact = next(f for f in read(ROOT / 'docs/unit-audit-20261105/VERIFIED-U22-VERB-FORMS-SOURCES.json')['facts'] if f['wordId'] == patch['id'])
            non_form = {k: v for k, v in row.items() if k != 'verbForms'}
            digest = hashlib.sha256(json.dumps(non_form, ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()
            assert digest == fact['nonFormRowSha256'], 'Exact U22 non-form row guard changed'
        if patch['id'] in INTEGRATED_U05_U06_FORM_IDS | INTEGRATED_U07_FORM_IDS | INTEGRATED_U08_U09_FORM_IDS | INTEGRATED_U10_FORM_IDS | INTEGRATED_U11_FORM_IDS | INTEGRATED_U12_FORM_IDS | INTEGRATED_U13_FORM_IDS | INTEGRATED_U14_FORM_IDS | INTEGRATED_U15_FORM_IDS:
            source_name = 'VERIFIED-INTEGRATED-U15-VERB-FORMS-SOURCES.json' if patch['id'] in INTEGRATED_U15_FORM_IDS else 'VERIFIED-INTEGRATED-U14-VERB-FORMS-SOURCES.json' if patch['id'] in INTEGRATED_U14_FORM_IDS else 'VERIFIED-INTEGRATED-U13-VERB-FORMS-SOURCES.json' if patch['id'] in INTEGRATED_U13_FORM_IDS else 'VERIFIED-INTEGRATED-U12-VERB-FORMS-SOURCES.json' if patch['id'] in INTEGRATED_U12_FORM_IDS else 'VERIFIED-INTEGRATED-U11-VERB-FORMS-SOURCES.json' if patch['id'] in INTEGRATED_U11_FORM_IDS else 'VERIFIED-INTEGRATED-U10-VERB-FORMS-SOURCES.json' if patch['id'] in INTEGRATED_U10_FORM_IDS else 'VERIFIED-INTEGRATED-U08-U09-VERB-FORMS-SOURCES.json' if patch['id'] in INTEGRATED_U08_U09_FORM_IDS else 'VERIFIED-INTEGRATED-U07-VERB-FORMS-SOURCES.json' if patch['id'] in INTEGRATED_U07_FORM_IDS else 'VERIFIED-INTEGRATED-U05-U06-VERB-FORMS-SOURCES.json'
            fact = next(f for f in read(ROOT / 'docs/unit-audit-20261105' / source_name)['facts'] if f['wordId'] == patch['id'])
            non_form = {k: v for k, v in row.items() if k != 'verbForms'}
            digest = hashlib.sha256(json.dumps(non_form, ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()
            assert digest == fact['nonFormRowSha256'], 'Exact integrated non-form row guard changed'
    for key, value in patch['before'].items():
        if key not in patch['after']:
            assert key in row and row[key] == value, 'Immutable source guard changed'
    if all(key in row and row[key] == value for key, value in patch['after'].items()):
        return False
    for key, value in patch['before'].items():
        if key == 'verbForms' and value == ABSENT:
            assert key not in row, 'Expected a genuinely missing optional field, not null or existing data'
        else:
            assert key in row and row[key] == value, 'Recorded old field/value differs'
    row.update(copy.deepcopy(patch['after']))
    return True

def read(path):
    return json.loads(path.read_text(encoding="utf-8"))

def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+"\n", encoding="utf-8", newline="\n")

def content_hash(data_dir):
    # Same LF-canonical file order as import_data.content_hash, without Excel dependencies.
    digest = hashlib.sha256()
    for name in ("words.json", "senses.json", "examples.json", "relations.json", "morphemes.json",
                 "notes.json", "exam_priority.json", "hooks.json", "media.json"):
        digest.update((data_dir/name).read_text(encoding="utf-8").encode("utf-8"))
    return digest.hexdigest()

def sha(path):
    return hashlib.sha256(path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    manifest = read(args.manifest)
    assert manifest["baseCommit"] == "29cfc684d7a11b07f09988c478d30358830f1951"
    data_dir = ROOT / "public/data/v1"
    datasets = {}
    changes = []
    for patch in manifest["patches"]:
        validate_patch_shape(patch)
        name = patch["dataset"]
        rows = datasets.setdefault(name, read(data_dir / f"{name}.json"))
        matches = [r for r in rows if r[patch["key"]] == patch["id"]]
        assert len(matches) == 1, patch["id"]
        row = matches[0]
        before = copy.deepcopy(row)
        if not apply_to_row(row, patch):
            continue
        if name == "examples":
            immutable = ("exampleId", "word", "sentenceEn", "blankSentence", "answer")
            if 'sentenceZh' not in patch['after']:
                immutable += ('sentenceZh',)
            for key in immutable:
                assert row.get(key) == before.get(key), (patch["id"], key)
        changes.append({"dataset": name, "id": patch["id"], "before": before, "after": row.copy(),
                        "reason": patch["reason"], "evidence": patch["evidence"]})
    receipt = {"manifest": str(args.manifest), "baseCommit": manifest["baseCommit"],
               "checkedAt": datetime.now(timezone.utc).isoformat(), "changeCount": len(changes), "changes": changes,
               "masterTouched": False, "sentencesChanged": any('sentenceZh' in p['after'] for p in manifest['patches']), "englishSentencesChanged": False, "imagesChanged": False,
               "sourceHashesBefore": {f: sha(data_dir/f) for f in ("words.json","senses.json","examples.json","meta.json","sa-pack.json")}}
    if args.apply and changes:
        out = ROOT / "output/unit-audit-20261105/receipts"
        out.mkdir(parents=True, exist_ok=True)
        target = out / (args.manifest.stem + ".json")
        assert not target.exists(), "Existing receipt; inspect before applying again"
        # Record the recoverable old rows before modifying the public snapshot.
        write_json(target, {**receipt, "state": "validated_before_write"})
        for name, rows in datasets.items():
            write_json(data_dir/f"{name}.json", rows)
        meta = read(data_dir/"meta.json")
        meta["generatedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        if "words" in datasets:
            meta["wordsHash"] = sha(data_dir/"words.json")
        meta["contentHash"] = content_hash(data_dir)
        write_json(data_dir/"meta.json", meta)
        build_sa_pack(data_dir)
        receipt["sourceHashesAfter"] = {f: sha(data_dir/f) for f in receipt["sourceHashesBefore"]}
        receipt["state"] = "applied_not_ui_verified"
        write_json(target, receipt)
        if "words" not in datasets:
            assert sha(data_dir/"words.json") == receipt["sourceHashesBefore"]["words.json"]
        for patch in manifest["patches"]:
            rows = read(data_dir/f"{patch['dataset']}.json")
            row = next(r for r in rows if r[patch["key"]] == patch["id"])
            assert all(row.get(k) == v for k,v in patch["after"].items())
    print(json.dumps({"mode": "apply" if args.apply else "dry_run", "changedRows": len(changes),
                      "datasets": list(datasets), "masterTouched": False, "sentencesChanged": receipt['sentencesChanged'], "englishSentencesChanged": False}))

if __name__ == "__main__":
    main()
