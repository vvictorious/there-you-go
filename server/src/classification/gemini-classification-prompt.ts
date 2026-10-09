import { DESTINATION_CATEGORIES } from '../places/destination-category';
import { DESTINATION_TAXONOMY_VERSION } from './classification-response';

export const GEMINI_CLASSIFICATION_PROMPT_V3 = `
Classify one ThereYouGo reminder input.

Return "classified" when one or more supported destination categories are
useful for obtaining the named item or items. Return every useful category.
Return "no-destination" for a task that does not require visiting a
destination. Return "needs-clarification" when the request is too ambiguous
or omits the item needed to choose a destination; ask one concise question.
Return "unsupported-destination" when the destination is clear but falls
outside the supported taxonomy.

Use taxonomy version ${DESTINATION_TAXONOMY_VERSION}. Supported categories:
${DESTINATION_CATEGORIES.join(', ')}.

Apply these destination-selection rules:

1. Include every common, actionable supported destination where a typical
store in that category is reasonably likely to stock the requested item. Do
not return only the specialist, best-known, or preferred retailer.
2. For a request containing multiple items, return a category only when a
typical store in that category is reasonably likely to satisfy the entire
basket in one visit. Do not combine categories that each cover only part of
the basket.
3. Calibrate broad retailers by their typical inventory:
   - Convenience stores carry a limited quick-stop selection such as basic
     groceries, common over-the-counter and personal-care products, batteries,
     common phone chargers, cards, and wrapping supplies. Do not assume they
     carry broad assortments, specialized goods, bulky home goods, or apparel.
   - Department stores carry broad mass-market assortments such as apparel,
     personal care, housewares, basic hardware and electronics, and common
     pet and automotive supplies. They are especially useful for mixed baskets,
     but do not assume specialist-only or unusually specific inventory.
4. Check ambiguity before assigning categories, especially for short phrases.
If a phrase has multiple common item meanings that imply materially different
destinations (for example, "apple" or "mouse") and context does not resolve
the meaning, return "needs-clarification". Do not ask for clarification merely
because one clearly named item is sold by multiple destination categories.

Apply these additional exact-request and outcome rules:

5. Evaluate the full item text as one exact request. Treat every qualifier,
intended use, recipient, compatibility constraint, and requested action as
required. Include a category only when a typical store in that category can
satisfy the qualified request, not merely sell a related generic item. For
example, "refill my allergy medicine" requires prescription-refill capability,
"flea meds for my dog" is not a human-pharmacy request, and a cable "for my
laptop" must be suitable for that use.
6. Distinguish tasks requiring no visit from physical errands outside the
taxonomy. Use "no-destination" only when the task itself requires no physical
destination. Use "unsupported-destination" when completing a physical errand
requires an unsupported business or service, even when the venue is implied
rather than named. For example, "grab a latte" is an unsupported coffee-shop
errand, not "no-destination".
`.trim();
