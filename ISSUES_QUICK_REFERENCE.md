# GitHub Issues Quick Reference

## View All Issues
```bash
gh issue list
```

## View Issues by Status
```bash
# Completed features
gh issue list --label completed

# In progress work
gh issue list --label in-progress

# Backlog items
gh issue list --label backlog

# Known bugs
gh issue list --label bug
```

## View Issues by Priority
```bash
# High priority items
gh issue list --label high-priority

# Medium priority items
gh issue list --label medium-priority
```

## View Issues by Category
```bash
# Features
gh issue list --label feature

# Enhancements
gh issue list --label enhancement

# Testing work
gh issue list --label testing

# Documentation
gh issue list --label documentation
```

## View Issues by Component
```bash
# Backend work
gh issue list --label backend

# Frontend work
gh issue list --label frontend

# Pricing system
gh issue list --label pricing

# Database work
gh issue list --label database
```

## Current Sprint (Recommended)

### Week 1-2: Critical Path
```bash
# In-progress items (must complete)
gh issue view 19  # Auto-recalculate prices
gh issue view 20  # Fallback pricing adjustments

# Critical bugs
gh issue view 54  # Inventory creation fallback
gh issue view 57  # Error message improvements
```

### Week 3-4: Testing Foundation
```bash
gh issue view 21  # Unit tests - pricing
gh issue view 23  # Integration tests - pricing API
gh issue view 24  # E2E tests - admin workflow
```

### Week 5-6: Documentation Sprint
```bash
gh issue view 28  # API documentation
gh issue view 29  # Pricing architecture docs
gh issue view 30  # Database schema docs
gh issue view 31  # Deployment guide
```

## Issue Number Reference

### Completed Features (#4-18)
- #4-5: Authentication & User Management
- #6-7: Seller & Inventory Management
- #8-10: Pricing System Core
- #11-14: UI & Cart
- #15-18: eBay & Market Data

### In Progress (#19-20)
- #19: Auto-recalculate on condition change
- #20: Fallback pricing improvements

### Testing (#21-27)
- #21-23: Unit & Integration tests
- #24-27: E2E test suites

### Documentation (#28-32)
- #28: API docs
- #29: Pricing architecture
- #30: Database schema
- #31: Deployment guide
- #32: eBay integration

### Technical Debt (#33-37)
- #33: Database optimization
- #34: Result caching
- #35: Pagination
- #36: Error handling
- #37: Logging

### Future Features (#38-53)
- #38-39: Analytics & Reporting
- #40-41: Marketplace integrations (Reverb, Amazon)
- #42-45: Inventory operations & search
- #46-48: Mobile app & admin management
- #49-53: Buyer features & payments

### Bugs & Enhancements (#54-58)
- #54-56: Known bugs
- #57-58: UI/UX enhancements

## Common Commands

### Create a new issue
```bash
gh issue create --title "Issue title" --body "Description" --label "feature,backend"
```

### Update an issue
```bash
gh issue edit 19 --add-label "needs-review"
gh issue edit 19 --remove-label "in-progress"
```

### Close an issue
```bash
gh issue close 19 --comment "Completed in PR #123"
```

### Reopen an issue
```bash
gh issue reopen 54
```

### Link issues to PRs
```bash
# In PR description or commit message:
# "Fixes #19" or "Closes #19" or "Resolves #19"
```

## Project Board Commands

### Create project board (if needed)
```bash
gh project create --title "Vinyl Catalog Sprint" --body "Current sprint work"
```

### Add issue to project
```bash
gh project item-add <project-number> --owner Badbeats87 --url https://github.com/Badbeats87/vinyl-catalog/issues/19
```

## Useful Filters

### All high-priority open items
```bash
gh issue list --label high-priority --state open
```

### Backend work in backlog
```bash
gh issue list --label backend --label backlog
```

### Open bugs
```bash
gh issue list --label bug --state open
```

### Recently updated issues
```bash
gh issue list --state all --limit 20 --json number,title,updatedAt --jq 'sort_by(.updatedAt) | reverse | .[] | "#\(.number): \(.title)"'
```

## Integration with Git

### Reference issues in commits
```bash
git commit -m "Fix pricing fallback logic

Addresses #20 - Apply condition adjustments to fallback pricing
when market data is missing."
```

### Auto-close issues with commits
```bash
git commit -m "Complete pagination implementation

Fixes #35 - All list endpoints now support cursor-based pagination"
```

## Tips

1. **Use templates**: Create issue templates in `.github/ISSUE_TEMPLATE/`
2. **Milestones**: Group related issues with milestones
3. **Projects**: Use GitHub Projects for sprint planning
4. **Labels**: Consistent labeling helps filtering
5. **Cross-reference**: Link related issues with #number syntax
6. **Automation**: Use GitHub Actions to auto-label or triage

## Links

- **Repository**: https://github.com/Badbeats87/vinyl-catalog
- **Issues**: https://github.com/Badbeats87/vinyl-catalog/issues
- **Full Summary**: See GITHUB_ISSUES_SUMMARY.md
