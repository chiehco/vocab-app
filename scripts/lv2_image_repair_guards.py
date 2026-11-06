"""Exact later image review layered over the immutable original LV1 approval."""
import copy
import hashlib
import json

def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()

def exact_published_image_expectation(card, approval, proof):
    assert card.get('id') == approval.get('id'), 'Exact published identity required'
    if card['id'] != 'LV1-U09-27':
        return copy.deepcopy(approval)
    p = proof['playground']
    assert digest(p['before']) == '92c168aba37c6019d879a297a341de0b9f288e501a4d0f9021901cf6b7308057', 'Original playground pair changed'
    assert digest(p['after']) == 'be8799ee867929ae1bbe0783ad7f9a1f1803c97a3af8321e409855b06402bc39', 'Exact repaired playground pair changed'
    assert digest(p['originalApproval']) == '0d196ff98c5d4e5795dca535e43bec6b6dfa48f9b3445f643595529b6cddff23', 'Immutable original approval changed'
    assert card == p['after'] and approval == p['originalApproval'], 'Exact after pair and original approval required'
    assert p['originalImageSha256'] == '2a11198019d75bd6c145a98ac9a5e0a661e5bf6070867b17d093b4ae1aa2b407'
    assert p['replacementImageSha256'] == 'a6b345e0f778db7542e02e6381d03444fcac0517551f2c2494b296e64ee8fd7f'
    expected = copy.deepcopy(approval)
    expected['publishedImageSha256'] = p['replacementImageSha256']
    return expected
