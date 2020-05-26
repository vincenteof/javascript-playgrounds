this.webpackChunk([18],{31:function(e,n,t){"use strict";t.r(n),n.default='/*! *****************************************************************************\nCopyright (c) Microsoft Corporation. All rights reserved.\nLicensed under the Apache License, Version 2.0 (the "License"); you may not use\nthis file except in compliance with the License. You may obtain a copy of the\nLicense at http://www.apache.org/licenses/LICENSE-2.0\n\nTHIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY\nKIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED\nWARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,\nMERCHANTABLITY OR NON-INFRINGEMENT.\n\nSee the Apache Version 2.0 License for specific language governing permissions\nand limitations under the License.\n***************************************************************************** */\n\n\n\n/// <reference no-default-lib="true"/>\r\n\n\ndeclare namespace Intl {\r\n    type DateTimeFormatPartTypes = "day" | "dayPeriod" | "era" | "hour" | "literal" | "minute" | "month" | "second" | "timeZoneName" | "weekday" | "year";\r\n\r\n    interface DateTimeFormatPart {\r\n        type: DateTimeFormatPartTypes;\r\n        value: string;\r\n    }\r\n\r\n    interface DateTimeFormat {\r\n        formatToParts(date?: Date | number): DateTimeFormatPart[];\r\n    }\r\n}\r\n'}});