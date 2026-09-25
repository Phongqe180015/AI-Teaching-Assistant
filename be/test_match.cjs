const sanitize = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const getKeywords = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 3);

const ruleTitle = 'Product List Feature Enhancements';
const ruleContextHint = 'Implement the following change requests: 1. Display only products that are in stock. 2. If stock < 10, display a red warning label. 3. Allow users to enable/disable stock warnings. 4. Add product search functionality. 5. Implement a 500ms debounce for search.';
const ruleKeywords = getKeywords(ruleTitle + ' ' + ruleContextHint);
console.log('Rule Keywords:', ruleKeywords);
console.log('Rule Keywords Count:', ruleKeywords.length);
console.log('Threshold:', ruleKeywords.length * 0.6);

const sectionText = `PART C – CHANGE REQUESTS (15 POINTS)
After completing the MVP, the Product Owner introduces the following changes.
Change Request #1
Display only products that are in stock.
Screenshots your demo here
Change Request #2
If stock < 10, display a red warning label.
Screenshots your demo here
Change Request #3
Allow users to enable/disable stock warnings.
Screenshots your demo here
Change Request #4
Add product search functionality.
Screenshots your demo here
Change Request #5
Implement a 500ms debounce for search.
Screenshots your demo here`;

const sectionKeywords = getKeywords(sectionText);
console.log('Section Keywords Count:', sectionKeywords.length);

let matches = 0;
for (const kw of ruleKeywords) {
    if (sectionKeywords.includes(kw)) matches++;
}
console.log('Matches:', matches);
