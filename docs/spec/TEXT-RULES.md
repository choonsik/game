# Text rules

These rules apply to all player text, spec text, and test titles.

## Basis

The rules are a subset of ASD-STE100 (Simplified Technical English). The project owner wrote "ASEO-100". No standard with that name exists. This file assumes the owner meant ASD-STE100. If this is wrong, change this file and the lint script.

The lint script `scripts/check-text.mjs` checks only the rules marked "checked". It does not check the approved-word dictionary. It does not replace a review by a person.

## Rules

| Rule | Checked |
|---|---|
| Write in English. Use ASCII characters only. | yes |
| Use 20 words or fewer in each sentence. | yes |
| Use the active voice. | warning |
| Write one instruction in each sentence. | no |
| Use "must" for an obligation. Do not use "shall". | yes |
| Do not use contractions. | yes |
| Do not use "e.g.", "i.e.", "etc.", or "and/or". | yes |
| Do not use dashes as punctuation. Do not use exclamation marks. | yes |
| Use the same word for the same thing. | no |
| Do not use the filler words and the promotional words in the list below. | yes |

## Banned words and phrases

seamless, robust, leverage, comprehensive, delve, cutting-edge, state-of-the-art, powerful, elegant, immersive, streamline, empower, holistic, synergy, game-changing, revolutionary, unlock, journey, crucial, pivotal, landscape, tapestry, utilize, ensure, simply, basically, essentially, just, very, really, in order to, it is important to note, please note, shall.

The list is in `scripts/check-text.mjs`. Add new words there.

## What these rules prevent

Text that sounds fluent but says little. Examples are filler, praise, and long sentences with many ideas. A requirement must state one fact that a test can check.
