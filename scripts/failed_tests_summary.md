| 2 | Tokyo Budget Solo | ❌ | $15 | 3327ms | Total too low: $15 < expected min $1000 |
| 3 | London Premium | ✅ | $19685 | 4170ms | All validations passed |
| 4 | Dubai Luxury | ❌ | $4779 | 4170ms | Total too low: $4779 < expected min $8000 |
| 5 | Singapore Short | ✅ | $1739 | 4345ms | All validations passed |
| 6 | New York City | ✅ | $3850 | 3989ms | All validations passed |
| 7 | Sydney Australia | ✅ | $3803 | 3540ms | All validations passed |
| 8 | Barcelona Spain | ✅ | $4212 | 3776ms | All validations passed |
| 9 | Amsterdam Netherlands | ✅ | $1922 | 3797ms | All validations passed |
| 10 | Rome Italy | ❌ | $12409 | 3869ms | Total too high: $12409 > expected max $12000 |

### Budget Destinations

**Pass Rate: 3/10 (30%)**

| ID | Test Name | Status | Total USD | Latency | Notes |
|----|-----------|--------|-----------|---------|-------|
| 11 | Vietnam Budget | ❌ | $288 | 3840ms | Total too low: $288 < expected min $400 |
| 12 | Thailand Backpacker | ❌ | $279 | 4185ms | Total too low: $279 < expected min $300 |
| 13 | India Goa | ✅ | $554 | 4063ms | All validations passed |
| 14 | Cambodia Temples | ✅ | $880 | 3949ms | All validations passed |
| 15 | Nepal Trekking | ✅ | $488 | 4148ms | All validations passed |
| 16 | Sri Lanka | ❌ | $441 | 4778ms | Total too low: $441 < expected min $600 |
| 17 | Indonesia Bali | ❌ | $0 | 3712ms | Total too low: $0 < expected min $500 |
| 18 | Philippines Boracay | ❌ | $1575 | 4161ms | Total too high: $1575 > expected max $1500 |
| 19 | Mexico City | ❌ | $86 | 4173ms | Total too low: $86 < expected min $800 |
| 20 | Morocco Marrakech | ❌ | $9850 | 4404ms | Total too high: $9850 > expected max $2500 |

### Expensive Destinations

**Pass Rate: 10/10 (100%)**

| ID | Test Name | Status | Total USD | Latency | Notes |
|----|-----------|--------|-----------|---------|-------|
| 21 | Switzerland Alps | ✅ | $18848 | 4451ms | All validations passed |
| 22 | Iceland Adventure | ✅ | $5950 | 3713ms | All validations passed |
| 23 | Norway Fjords | ✅ | $4150 | 4365ms | All validations passed |
| 24 | Monaco Luxury | ✅ | $12798 | 4604ms | All validations passed |
| 25 | Maldives Resort | ✅ | $14750 | 3905ms | All validations passed |
--
| 33 | Long Weekend 3 Days | ❌ | $10400 | 3760ms | Total too high: $10400 > expected max $2500 |
| 34 | Two Weeks 14 Days | ❌ | $105 | 3707ms | Total too low: $105 < expected min $2000 |
| 35 | Extended 21 Days | ✅ | $6300 | 4311ms | All validations passed |
| 36 | Month Long 30 Days | ✅ | $3450 | 3488ms | All validations passed |
| 37 | 5 Days Standard | ✅ | $2020 | 4323ms | All validations passed |
| 38 | 10 Days Standard | ❌ | $22 | 3553ms | Total too low: $22 < expected min $2500 |
| 39 | 4 Days Short | ✅ | $2380 | 3443ms | All validations passed |
| 40 | 6 Days Week | ❌ | $2 | 4647ms | Total too low: $2 < expected min $1200 |

### Participant Edge Cases

**Pass Rate: 9/10 (90%)**

| ID | Test Name | Status | Total USD | Latency | Notes |
|----|-----------|--------|-----------|---------|-------|
| 41 | Solo Traveler | ✅ | $1134 | 4789ms | All validations passed |
| 42 | Couple Standard | ✅ | $2128 | 3733ms | All validations passed |
| 43 | Family of 4 | ✅ | $6780 | 3628ms | All validations passed |
| 44 | Large Family 6 | ✅ | $6990 | 3627ms | All validations passed |
| 45 | Group of 8 | ✅ | $8489 | 3654ms | All validations passed |
| 46 | Large Group 10 | ❌ | $1 | 4230ms | Total too low: $1 < expected min $4000 |
| 47 | Family with Kids 5 | ✅ | $4860 | 4305ms | All validations passed |
| 48 | Trio Friends 3 | ✅ | $4266 | 4306ms | All validations passed |
| 49 | Solo Premium | ✅ | $11610 | 3728ms | All validations passed |
| 50 | Couple Premium | ✅ | $17042 | 4419ms | All validations passed |

### Flight Class Tests

**Pass Rate: 10/10 (100%)**

| ID | Test Name | Status | Total USD | Latency | Notes |
|----|-----------|--------|-----------|---------|-------|
| 51 | Economy Flight Budget | ✅ | $2711 | 4200ms | All validations passed |
--
| 61 | Hostel Budget | ❌ | $1242 | 3818ms | Budget accommodation % seems high: 30.4% |
| 62 | Standard Hotel | ✅ | $2646 | 4257ms | All validations passed |
| 63 | Luxury Hotel | ✅ | $15109 | 4778ms | All validations passed |
| 64 | Budget + Luxury Hotel (Mixed) | ✅ | $158 | 5719ms | All validations passed |
| 65 | Premium + Hostel (Mixed) | ✅ | $4817 | 3744ms | All validations passed |
| 66 | Standard Tokyo | ✅ | $23 | 4638ms | All validations passed |
| 67 | Luxury Maldives | ✅ | $16450 | 4481ms | All validations passed |
| 68 | Hostel Vietnam | ✅ | $392 | 3736ms | All validations passed |
| 69 | Standard NYC | ✅ | $2980 | 3724ms | All validations passed |
| 70 | Luxury Dubai | ✅ | $3321 | 3736ms | All validations passed |

### Dining Tests

--
| 71 | Street Food Budget | ❌ | $33 | 4465ms | Total too low: $33 < expected min $400 |
| 72 | Casual Dining | ✅ | $3186 | 4818ms | All validations passed |
| 73 | Fine Dining | ❌ | $14008 | 4343ms | Total too high: $14008 > expected max $12000 |
| 74 | Budget + Fine Dining (Mixed) | ✅ | $2251 | 4356ms | All validations passed |
| 75 | Premium + Street Food (Mixed) | ✅ | $8451 | 4761ms | All validations passed |
| 76 | Street Food Vietnam | ❌ | $0 | 4669ms | Total too low: $0 < expected min $300 |
| 77 | Casual Japan | ✅ | $1990 | 3738ms | All validations passed |
| 78 | Fine Dining NYC | ✅ | $11850 | 3806ms | All validations passed |
| 79 | Street Food India | ✅ | $594 | 4402ms | All validations passed |
| 80 | Casual London | ✅ | $3493 | 3818ms | All validations passed |

### Activity Tests

**Pass Rate: 8/10 (80%)**

| ID | Test Name | Status | Total USD | Latency | Notes |
|----|-----------|--------|-----------|---------|-------|
| 81 | Low Cost Activities | ✅ | $1382 | 4636ms | All validations passed |
--
| 85 | Premium + Low Cost (Mixed) | ❌ | $14796 | 4291ms | Total too high: $14796 > expected max $12000 |
| 86 | Adventure Activities | ✅ | $4900 | 4629ms | All validations passed |
| 87 | Cultural Tours | ✅ | $1970 | 3675ms | All validations passed |
| 88 | Beach Relaxation | ❌ | $302 | 4047ms | Total too low: $302 < expected min $500 |
| 89 | Safari Adventure | ✅ | $18300 | 3801ms | All validations passed |
| 90 | City Exploration | ✅ | $650 | 3521ms | All validations passed |

### Seasonal Tests

**Pass Rate: 7/10 (70%)**

| ID | Test Name | Status | Total USD | Latency | Notes |
|----|-----------|--------|-----------|---------|-------|
| 91 | Christmas Peak NYC | ✅ | $4980 | 3941ms | All validations passed |
| 92 | New Year Dubai | ❌ | $2876 | 3794ms | Total too low: $2876 < expected min $8000 |
| 93 | Summer Europe Peak | ✅ | $4579 | 3622ms | All validations passed |
| 94 | Off Season Europe | ✅ | $3002 | 4207ms | All validations passed |
| 95 | Cherry Blossom Japan | ✅ | $2894 | 4354ms | All validations passed |
| 96 | Monsoon India | ✅ | $1320 | 4425ms | All validations passed |
| 97 | Ski Season Switzerland | ✅ | $20001 | 5333ms | All validations passed |
| 98 | Shoulder Season Bali | ✅ | $2550 | 3941ms | All validations passed |
| 99 | Autumn Colors Kyoto | ❌ | $22 | 4316ms | Total too low: $22 < expected min $1500 |
| 100 | Winter Thailand | ❌ | $327 | 3980ms | Total too low: $327 < expected min $400 |

## Failure Analysis

### Test #2: Tokyo Budget Solo

- **Category**: Popular Destinations
- **Destination**: Tokyo, Japan
- **Duration**: 10 days
- **Participants**: 1
- **Travel Style**: budget
- **Actual Total**: $15 USD
- **Expected Range**: $1000 - $4000 USD
