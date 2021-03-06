import React from "react";
import { headerBackgroundColor, headerTintColor } from "../Colors";
import { Component } from "react";
import { Currency, currencies } from "../Currencies";
import { Decimal } from "decimal.js";
import {
	ScrollView,
	View,
} from "react-native";
import { connect } from "react-redux";
import {
	categories,
	Category,
	findCategory,
	iconClass
} from "../Categories";
import {
	amountColor,
	ClampedMonth,
	clampedMonthBoundaries,
	currentClampedMonth,
	isCurrent,
	localizeClamped,
	nextClampedMonth,
	priorClampedMonth,
} from "../Util";
import AppState from "../AppState";
import {
	filterLastDays,
	groupedCats,
	lastNDays,
	storePastExpenses,
	TransactionList,
} from "../BudgetStore";
import {
	Text,
	ButtonGroup,
	Button,
	Icon,
} from "react-native-elements";
import { Map } from "immutable";
import { StackedBarChart, Grid, YAxis, PieChart } from "react-native-svg-charts";
import { G, Circle, Image, Line, Text as SvgText } from "react-native-svg";
import { categoryDataEquals, CategoryData } from "../CategoryData";
import {
	Table,
	Rows,
} from "react-native-table-component";

interface Props {
	readonly currency: Currency;
	readonly navigation: any;
	readonly transactions: TransactionList;
	readonly assocs: Map<string, CategoryData>;
}

interface State {
	icons: Map<string, any>;
	distributionIndex: number;
	sumExpenseIndex: number;
	sumIncomeIndex: number;
	selectedMonth: ClampedMonth;
}

class Stats extends Component<Props, State> {
	public static navigationOptions = {
		headerStyle: {
			backgroundColor: headerBackgroundColor,
		},
		headerTintColor,
		title: "Stats",
	};

	private scrollViewRef: any | undefined;

	constructor(props: Props) {
		super(props);
		this.state = {
			icons: Map(),
			distributionIndex: 0,
			sumExpenseIndex: 0,
			sumIncomeIndex: 0,
			selectedMonth: currentClampedMonth(),
		};

		this.updateDistribution = this.updateDistribution.bind(this);
		this.updateExpenseSum = this.updateExpenseSum.bind(this);
		this.previousMonth = this.previousMonth.bind(this);
		this.nextMonth = this.nextMonth.bind(this);
		this.contentSizeChange = this.contentSizeChange.bind(this);
		this.updateIncomeSum = this.updateIncomeSum.bind(this);
	}

	private updateDistribution(newIndex: number) {
		this.setState({ ...this.state, distributionIndex: newIndex, });
	}

	private previousMonth() {
		this.setState({ ...this.state, selectedMonth: priorClampedMonth(this.state.selectedMonth), });
	}

	private contentSizeChange() {
		// This behavior is a bit strange
		/* if (this.scrollViewRef !== undefined) {
			 this.scrollViewRef.scrollToEnd();
		   } */
	}

	private nextMonth() {
		this.setState({ ...this.state, selectedMonth: nextClampedMonth(this.state.selectedMonth), });
	}

	private updateExpenseSum(newIndex: number) {
		this.setState({ ...this.state, sumExpenseIndex: newIndex, });
	}

	private updateIncomeSum(newIndex: number) {
		this.setState({ ...this.state, sumIncomeIndex: newIndex, });
	}

	public componentDidMount() {
		this.calculateIcons();
	}

	public componentDidUpdate(prevProps: Props) {
		const pa = prevProps.assocs;
		const a = this.props.assocs;

		let recalculate = false;
		const ak = a.keySeq();
		if (!ak.equals(pa.keySeq())) {
			recalculate = true;
		} else {
			recalculate = ak.some((k: string) => !categoryDataEquals(a.get(k) as CategoryData, pa.get(k) as CategoryData));
		}
		if (recalculate) {
			this.calculateIcons();
		}
	}

	private calculateIcons() {
		categories
			.forEach((c) => {
				const assoc = this.props.assocs.get(
					c.name,
					c.data);
				const ic = iconClass(assoc.icon.type);
				const icp = ic.getImageSource(assoc.icon.name, 32, "white");
				icp.then((source: any) => {
					this.setState({ icons: this.state.icons.set(c.name, source) });
				});
			});
	}

	private getIcon(s: string): any {
		return this.state.icons.get(s);
	}

	private indexToDays(n: number): number {
		if (n == 0) {
			return 7;
		}
		if (n == 1) {
			return 30;
		}
		return 365;
	}

	public render() {
		const axesSvg = { fontSize: 10, fill: "grey" };
		const verticalContentInset = { top: 10, bottom: 10 };
		const ts = this.props.transactions;
		const sumListDataPositive = lastNDays(ts, this.indexToDays(this.state.sumIncomeIndex), true).toJS();
		const sumListDataNegative = lastNDays(ts, this.indexToDays(this.state.sumExpenseIndex), false).toJS();
		const sumKeys = categories.map((c) => c.name).toArray();
		const sumColors = categories.map((c) => "#" + c.data.color).toArray();
		const pieData = groupedCats(filterLastDays(ts, this.indexToDays(this.state.distributionIndex), false));
		const CoolLabels = ({ slices }: { slices: any }) => {
			return slices.map((slice: any, index: any) => {
				const { labelCentroid, pieCentroid, data } = slice;
				return (
					<G key={index}>
						<Line
							x1={labelCentroid[0]}
							y1={labelCentroid[1]}
							x2={pieCentroid[0]}
							y2={pieCentroid[1]}
							stroke={data.svg.fill}
						/>
						<Circle
							cx={labelCentroid[0]}
							cy={labelCentroid[1]}
							r={18}
							fill={data.svg.fill}
						/>
						<Image
							x={labelCentroid[0] - 9}
							y={labelCentroid[1] - 9}
							width={18}
							height={18}
							opacity="1"
							href={this.getIcon(data.key)}
						/>
						<SvgText fill="black" fontSize={16} x={labelCentroid[0]} y={labelCentroid[1] + 35} textAnchor="middle">
							{data.amount.toString() + this.props.currency.symbol}
						</SvgText>
					</G>
				)
			})
		};
		const timeButtonsShort = ["Week", "Month"];
		const timeButtons = ["Week", "Month", "Year"];

		const monthBoundaries = clampedMonthBoundaries(this.state.selectedMonth);
		const priorMonthBoundaries = clampedMonthBoundaries(priorClampedMonth(this.state.selectedMonth));
		const currentExpenses = storePastExpenses(this.props.transactions, monthBoundaries);
		const priorExpenses = storePastExpenses(this.props.transactions, priorMonthBoundaries);
		const expenseCategories = currentExpenses.keySeq().toSet().union(priorExpenses.keySeq().toSet());

		const currentSum = currentExpenses.valueSeq().reduce((sum: Decimal, x: Decimal) => sum.add(x), new Decimal(0));
		const priorSum = priorExpenses.valueSeq().reduce((sum: Decimal, x: Decimal) => sum.add(x), new Decimal(0));

		const tableRows = expenseCategories.valueSeq().map((category: string) => {
			const prior = priorExpenses.get(category);
			const current = currentExpenses.get(category);

			if (prior !== undefined && current !== undefined) {
				return [category, [current, (current.minus(prior))]];
			}
			if (prior !== undefined) {
				return [category, [new Decimal("0"), prior.negated()]];
			}

			return [category, [current, current]];
		}
		).sortBy((r: [string, [Decimal, Decimal]]) => r[1][0])
			.map((r: [string, [Decimal, Decimal]]) => {
				const catName = r[0];
				const catData = findCategory(catName) as Category;
				const amount = r[1][0];
				const amountC = amountColor(amount);
				const assoc: CategoryData = this.props.assocs.get(
					catName,
					catData.data);
				const icon = (<Icon
					reverse
					color={"#" + assoc.color}
					name={assoc.icon.name}
					size={18}
					type={assoc.icon.type} />);
				return [
					<View style={{ paddingLeft: 0, paddingRight: 10 }}>{icon}</View>,
					<Text style={{ color: amountC, textAlign: "left", fontSize: 20, fontWeight: "bold" }}>
						{amount.toString()}{this.props.currency.symbol}
					</Text>,
					<Text style={{ color: amountC, textAlign: "left", fontSize: 20 }}>
						({r[1][1].isPositive() ? "+" : ""}{r[1][1].toString()})
					    </Text>,
				];
			}
			).toList().push([
				<View style={{ paddingLeft: 0, paddingRight: 10 }}><Icon
					reverse
					color="black"
					name="sigma"
					size={18}
					type="material-community" /></View>,
				<Text style={{ color: amountColor(currentSum), textAlign: "left", fontSize: 20, fontWeight: "bold" }}>
					{currentSum.toString()}{this.props.currency.symbol}
				</Text>,
				<Text style={{ color: amountColor(currentSum), textAlign: "left", fontSize: 20 }}>
					({currentSum.minus(priorSum).isPositive() ? "+" : ""}{currentSum.minus(priorSum).toString()})
				</Text>,
			]);

		const table = (<Table borderStyle={{ borderColor: "transparent" }}>
			<Rows flexArr={[1, 3, 2]} data={tableRows} textStyle={{ textAlign: "center" }} />
		</Table>);
		return (
			<ScrollView ref={(component) => { this.scrollViewRef = component; }} onContentSizeChange={this.contentSizeChange}>
				<View style={{ paddingLeft: 10 }}>
					<Text h4>Daily Expenses</Text>
					<ButtonGroup onPress={this.updateExpenseSum} selectedIndex={this.state.sumExpenseIndex} buttons={timeButtonsShort} />
				</View>
				<View style={{ height: 300, padding: 20, flexDirection: "row" }}>
					<YAxis
						data={StackedBarChart.extractDataPoints(sumListDataNegative, sumKeys)}
						svg={axesSvg}
						contentInset={verticalContentInset}
					/>
					<StackedBarChart
						style={{ flex: 1 }}
						data={sumListDataNegative}
						keys={sumKeys}
						colors={sumColors}
						contentInset={verticalContentInset}
					>
						<Grid />
					</StackedBarChart>
				</View>
				<View style={{ paddingLeft: 10 }}>
					<Text h4>Daily Income</Text>
					<ButtonGroup
						onPress={this.updateIncomeSum}
						selectedIndex={this.state.sumIncomeIndex}
						buttons={timeButtonsShort} />
				</View>
				<View style={{ height: 300, padding: 20, flexDirection: "row" }}>
					<YAxis
						data={StackedBarChart.extractDataPoints(sumListDataPositive, sumKeys)}
						svg={axesSvg}
						contentInset={verticalContentInset}
					/>
					<StackedBarChart
						style={{ flex: 1 }}
						data={sumListDataPositive}
						keys={sumKeys}
						colors={sumColors}
						contentInset={verticalContentInset}
					>
						<Grid />
					</StackedBarChart>
				</View>
				<View style={{ paddingLeft: 10 }}>
					<Text h4>Distribution Expenses</Text>
					<ButtonGroup
						onPress={this.updateDistribution}
						selectedIndex={this.state.distributionIndex}
						buttons={timeButtons} />
				</View>
				<PieChart
					style={{ height: 400 }}
					valueAccessor={({ item }) => item.amount}
					data={pieData}
					innerRadius={40}
					outerRadius={110}
					labelRadius={160}
				>
					<CoolLabels />
				</PieChart>
				<View style={{ paddingLeft: 10 }}>
					<Text h4>Monthly numbers</Text>
					<View style={{ flex: 1, flexDirection: "row", width: "100%", justifyContent: "space-evenly", alignItems: "center" }}>
						<Button type="outline" title="  <  " onPress={this.previousMonth} titleStyle={{ fontSize: 17 }} />
						<Text style={{ fontSize: 18 }}>{localizeClamped(this.state.selectedMonth)}</Text>
						<Button type="outline" title="  >  " onPress={this.nextMonth} disabled={isCurrent(this.state.selectedMonth)} titleStyle={{ fontSize: 17 }} />
					</View>
				</View>
				<View style={{ paddingLeft: 10, paddingRight: 10 }}>
					{table}
				</View>
			</ScrollView >
		);
	}
}

const mapStateToProps = (state: AppState, ownProps: any) => {
	return {
		assocs: state.associations === undefined ? Map<string, CategoryData>() : state.associations,
		currency: currencies.get(state.settings.currency) as Currency,
		navigation: ownProps.navigation,
		transactions: state.transactions,
	};
};

const mapDispatchToProps = (dispatch: any) => {
	return {
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(Stats);
